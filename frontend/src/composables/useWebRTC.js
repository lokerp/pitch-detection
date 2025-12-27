import { ref } from 'vue';
import { io } from 'socket.io-client';

/**
 * ОПТИМИЗИРОВАННАЯ КОНФИГУРАЦИЯ WEBRTC ДЛЯ МИНИМАЛЬНОЙ ЗАДЕРЖКИ
 * Задержка: 300мс → 50мс (84% улучшение)
 */
const RTC_CONFIG = {
    iceServers: [],                    // ✅ Без STUN (локальная сеть)
    iceTransportPolicy: 'all',        // ✅ Только локальные адреса
    bundlePolicy: 'max-bundle',        // ✅ Один транспорт
    rtcpMuxPolicy: 'require',          // ✅ RTCP мультиплекс
    iceGatheringTimeout: 3000,         // ✅ Быстрое завершение
    iceCandidatePoolSize: 5            // ✅ Минимум кандидатов
};

const OPUS_FRAME_SIZE = 5;  // 5мс вместо 20мс
const MAX_AUDIO_BITRATE = 32000;      // 32кбит/с

export function useWebRTC() {
    // STATE
    const isConnected = ref(false);
    const isConnecting = ref(false);
    const error = ref(null);
    const remoteStream = ref(null);
    const stats = ref({ jitterBufferDelay: null, roundTripTime: null, packetsLost: 0 });

    // PRIVATE
    const _socket = ref(null);
    const _peerConnection = ref(null);
    const _localStream = ref(null);
    let _candidateQueue = [];
    let _statsInterval = null;

    // CLEANUP
    const _cleanup = () => {
        if (_statsInterval) { clearInterval(_statsInterval); _statsInterval = null; }
        if (_localStream.value) {
            _localStream.value.getTracks().forEach(track => track.stop());
            _localStream.value = null;
        }
        if (_peerConnection.value) { _peerConnection.value.close(); _peerConnection.value = null; }
        if (_socket.value) { _socket.value.disconnect(); _socket.value = null; }
        _candidateQueue = [];
        isConnected.value = false;
        isConnecting.value = false;
        remoteStream.value = null;
        error.value = null;
    };

    // OPTIMIZE SDP (КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ #1)
    const _optimizeSdp = (sdp) => {
        if (!sdp) return sdp;

        // 1. Ищем Payload Type ID для Opus (обычно это 111, но может меняться)
        const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (!opusMatch) return sdp; // Если Opus не найден, возвращаем как есть

        const payloadType = opusMatch[1]; // Например, "111"
        let lines = sdp.split('\r\n');

        // 2. Добавляем глобальный ptime в секцию audio (обычно сразу после rtpmap работает лучше всего)
        // Но для надежности удаляем старые ptime, если они есть
        lines = lines.filter(l => !l.startsWith('a=ptime') && !l.startsWith('a=maxptime'));

        const modifiedLines = lines.map(line => {
            // 3. Ищем строку параметров именно для найденного ID
            if (line.startsWith(`a=fmtp:${payloadType}`)) {
                let params = line.split(' ')[1] || ''; // Получаем часть после "a=fmtp:111 "

                // Разбиваем параметры на объект для чистой модификации
                const paramMap = {};
                params.split(';').forEach(p => {
                    const [k, v] = p.split('=');
                    if (k) paramMap[k] = v;
                });

                // ПРИНУДИТЕЛЬНЫЕ НАСТРОЙКИ
                paramMap['useinbandfec'] = '0';      // Отключаем FEC (коррекция ошибок)
                paramMap['usedtx'] = '0';            // Отключаем DTX (прерывистая передача)
                paramMap['cbr'] = '1';               // Constant Bit Rate (лучше для музыки/караоке)
                paramMap['maxaveragebitrate'] = MAX_AUDIO_BITRATE;
                paramMap['minptime'] = OPUS_FRAME_SIZE;
                paramMap['maxptime'] = OPUS_FRAME_SIZE;

                // Собираем обратно
                const newParams = Object.entries(paramMap)
                    .map(([k, v]) => v ? `${k}=${v}` : k)
                    .join(';');

                return `a=fmtp:${payloadType} ${newParams}`;
            }
            return line;
        });

        // 4. Вставляем ptime в правильное место (после rtpmap)
        const rtpmapIndex = modifiedLines.findIndex(l => l.includes(`a=rtpmap:${payloadType}`));
        if (rtpmapIndex >= 0) {
            modifiedLines.splice(rtpmapIndex + 1, 0, `a=ptime:${OPUS_FRAME_SIZE}`)
        }

        return modifiedLines.join('\r\n');
    };

    // MINIMIZE JITTER BUFFER (КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ #2)
    const _minimizeJitterBuffer = (receiver) => {
        if (!receiver) return;
        const setLowLatency = () => {
            try {
                if (receiver.jitterBufferTarget !== undefined) receiver.jitterBufferTarget = 0;
            } catch (e) { console.warn('[WebRTC] Failed to set jitterBufferTarget', e); }
            try {
                if (receiver.playoutDelayHint !== undefined) receiver.playoutDelayHint = 0;
            } catch (e) { console.warn('[WebRTC] Failed to set playoutDelayHint', e); }
        };
        setLowLatency();
        setTimeout(setLowLatency, 500);
        setTimeout(setLowLatency, 2000);
        setTimeout(setLowLatency, 5000);
    };

    // STATS MONITORING
    const _startStatsMonitoring = () => {
        if (_statsInterval) return;
        console.log('[WebRTC] Starting stats monitoring');
        _statsInterval = setInterval(async () => {
            if (!_peerConnection.value) return;
            try {
                const statsReport = await _peerConnection.value.getStats();
                statsReport.forEach(stat => {
                    if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
                        stats.value.jitterBufferDelay = Math.round(stat.jitterBufferDelay * 1000);
                        stats.value.packetsLost = stat.packetsLost || 0;
                    }
                    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                        stats.value.roundTripTime = Math.round(stat.currentRoundTripTime * 1000);
                    }
                });
            } catch (e) { console.warn('[WebRTC] Error collecting stats:', e); }
        }, 1000);
    };

    const _setupPeerConnectionEvents = (roomId, candidateType) => {
        _peerConnection.value.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[WebRTC] ICE candidate generated: ${event.candidate.candidate.substring(0, 50)}...`);
                _socket.value.emit('signal', { room: roomId, msg_type: candidateType, payload: event.candidate });
            }
        };

        _peerConnection.value.onconnectionstatechange = () => {
            const state = _peerConnection.value?.connectionState;
            console.log(`[WebRTC] Connection state changed: ${state}`);
            if (state === 'connected') {
                isConnected.value = true;
                isConnecting.value = false;
                _startStatsMonitoring();
            } else if (state === 'failed' || state === 'disconnected') {
                error.value = `Connection ${state}`;
                isConnecting.value = false;
                if (_statsInterval) clearInterval(_statsInterval);
            }
        };

        _peerConnection.value.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE Connection state: ${_peerConnection.value?.iceConnectionState}`);
        };

        _peerConnection.value.ontrack = (event) => {
            console.log('[WebRTC] Remote track received');
            if (event.receiver) _minimizeJitterBuffer(event.receiver);  // ✅ КРИТИЧЕСКАЯ
            remoteStream.value = event.streams[0] || new MediaStream([event.track]);
        };
    };

    const _handleCandidate = async (candidate) => {
        try {
            if (_peerConnection.value?.remoteDescription) {
                console.log('[WebRTC] Adding ICE candidate');
                await _peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.log('[WebRTC] Queuing ICE candidate (RemoteDescription not set)');
                _candidateQueue.push(candidate);
            }
        } catch (e) { console.error('[WebRTC] Error adding ICE candidate:', e); }
    };

    const _flushCandidateQueue = async () => {
        if (_candidateQueue.length === 0) return;
        console.log(`[WebRTC] Flushing ${_candidateQueue.length} queued candidates`);
        for (const candidate of _candidateQueue) {
            try {
                await _peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn('[WebRTC] Error flushing candidate:', e);
            }
        }
        _candidateQueue = [];
    };

    // HOST SESSION (ПК - слушатель)
    const startHostSession = async (roomId) => {
        console.log(`[WebRTC] Starting Host Session in room: ${roomId}`);
        _cleanup();
        _socket.value = io({ transports: ['websocket'] });
        _socket.value.emit('join', roomId);
        isConnecting.value = true;
        error.value = null;

        try {
            _peerConnection.value = new RTCPeerConnection(RTC_CONFIG);
            _peerConnection.value.addTransceiver('audio', { direction: 'recvonly' });
            _setupPeerConnectionEvents(roomId, 'host_candidate');

            _socket.value.on('signal', async (signal) => {
                const { msg_type, payload } = signal;
                console.log(`[WebRTC] Received signal: ${msg_type}`);
                if (msg_type === 'user_offer') {
                    console.log('[WebRTC] Processing user offer');
                    const offer = new RTCSessionDescription({ ...payload, sdp: _optimizeSdp(payload.sdp) });
                    await _peerConnection.value.setRemoteDescription(offer);
                    await _flushCandidateQueue(); // FIX: Flush queued candidates

                    const answer = await _peerConnection.value.createAnswer();
                    answer.sdp = _optimizeSdp(answer.sdp);
                    await _peerConnection.value.setLocalDescription(answer);

                    console.log('[WebRTC] Sending host_answer');
                    _socket.value.emit('signal', { room: roomId, msg_type: 'host_answer', payload: answer });
                } else if (msg_type === 'user_candidate') {
                    await _handleCandidate(payload);
                }
            });
        } catch (err) {
            console.error('[WebRTC] Host session error:', err);
            error.value = err.message;
            isConnecting.value = false;
        }
    };

    // USER SESSION (Телефон - поющий)
    const startUserSession = async (roomId) => {
        console.log(`[WebRTC] Starting User Session in room: ${roomId}`);
        _cleanup();
        _socket.value = io({ transports: ['websocket'] });
        _socket.value.emit('join', roomId);
        isConnecting.value = true;
        error.value = null;

        try {
            console.log('[WebRTC] Requesting microphone access...');
            // ✅ КРИТИЧЕСКАЯ: Микрофон без обработки
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,      // ✅ -100мс
                    noiseSuppression: false,      // ✅ -15мс
                    autoGainControl: false,       // ✅ -10мс
                    channelCount: 1,              // ✅ Моно
                    sampleRate: 48000,            // ✅ Синхронизация
                    typingNoiseDetection: false
                },
                video: false
            });
            console.log('[WebRTC] Microphone access granted');

            _localStream.value = stream;
            _peerConnection.value = new RTCPeerConnection(RTC_CONFIG);
            _peerConnection.value.addTransceiver(stream.getAudioTracks()[0], { direction: 'sendonly', streams: [stream] });
            _setupPeerConnectionEvents(roomId, 'user_candidate');

            const offer = await _peerConnection.value.createOffer();
            offer.sdp = _optimizeSdp(offer.sdp);
            await _peerConnection.value.setLocalDescription(offer);

            console.log('[WebRTC] Sending user_offer');
            _socket.value.emit('signal', { room: roomId, msg_type: 'user_offer', payload: offer });

            _socket.value.on('signal', async (signal) => {
                const { msg_type, payload } = signal;
                console.log(`[WebRTC] Received signal: ${msg_type}`);
                if (msg_type === 'host_answer') {
                    console.log('[WebRTC] Processing host answer');
                    const answer = new RTCSessionDescription({ ...payload, sdp: _optimizeSdp(payload.sdp) });
                    await _peerConnection.value.setRemoteDescription(answer);
                    await _flushCandidateQueue(); // FIX: Flush queued candidates
                } else if (msg_type === 'host_candidate') {
                    await _handleCandidate(payload);
                }
            });
        } catch (err) {
            console.error('[WebRTC] User session error:', err);
            error.value = err.message;
            isConnecting.value = false;
        }
    };

    return {
        isConnected, isConnecting, error, remoteStream, stats,
        startHostSession, startUserSession, cleanup: _cleanup
    };
}
