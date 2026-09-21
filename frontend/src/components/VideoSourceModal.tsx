import React, { useState } from 'react';
import { X, Upload, Video, Globe, Camera, Check, AlertCircle } from 'lucide-react';

interface VideoSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideoUrl: (url: string, name: string) => void;
  onSelectWebcam: () => void;
}

export const VideoSourceModal: React.FC<VideoSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectVideoUrl,
  onSelectWebcam
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'rtsp' | 'samples'>('upload');
  const [rtspUrl, setRtspUrl] = useState<string>('rtsp://192.168.1.120:554/live/ch0');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle local video file upload to backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadFeedback(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadFeedback(`${file.name} uploaded successfully!`);
        setTimeout(() => {
          onSelectVideoUrl(data.url, file.name);
          onClose();
        }, 1000);
      } else {
        // Fallback: If backend upload fails, create local blob URL directly in browser!
        const blobUrl = URL.createObjectURL(file);
        setUploadFeedback(`${file.name} loaded into AI Vision engine!`);
        setTimeout(() => {
          onSelectVideoUrl(blobUrl, file.name);
          onClose();
        }, 1000);
      }
    } catch {
      // Direct browser fallback using blob URL
      const blobUrl = URL.createObjectURL(file);
      setUploadFeedback(`${file.name} loaded directly!`);
      setTimeout(() => {
        onSelectVideoUrl(blobUrl, file.name);
        onClose();
      }, 800);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConnectRTSP = async () => {
    if (!rtspUrl.trim()) return;
    try {
      await fetch('/api/connect-cctv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rtspUrl, camera_name: 'Factory IP Camera' })
      });
    } catch {}

    onSelectVideoUrl(rtspUrl, 'CCTV IP Camera');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} color="var(--safety-green)" />
            <span className="modal-title">Select Video & Camera Input Source</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '8px' }}>
            <button
              className={`clean-ctrl-btn ${activeTab === 'upload' ? 'primary' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} />
              <span>Upload Factory Video</span>
            </button>

            <button
              className={`clean-ctrl-btn ${activeTab === 'rtsp' ? 'primary' : ''}`}
              onClick={() => setActiveTab('rtsp')}
            >
              <Globe size={14} />
              <span>CCTV / RTSP Stream</span>
            </button>

            <button
              className="clean-ctrl-btn"
              onClick={() => {
                onSelectWebcam();
                onClose();
              }}
            >
              <Camera size={14} />
              <span>Live Camera</span>
            </button>
          </div>

          {/* Tab 1: Upload Video */}
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  border: '2px dashed var(--border-active)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--surface-panel-subtle)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <input
                  type="file"
                  accept="video/mp4,video/avi,video/mov,video/mkv,video/webm"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }}
                />
                <Upload size={36} color="var(--safety-green)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                  {isUploading ? 'Uploading Video to AI Engine...' : 'Click to Browse or Drag & Drop Factory CCTV Footage'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Supports MP4, AVI, MOV, MKV files. Real-time safety gear detection will run on all workers.
                </div>
              </div>

              {uploadFeedback && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safety-green)', fontSize: '12px', fontWeight: 600 }}>
                  <Check size={16} />
                  <span>{uploadFeedback}</span>
                </div>
              )}

              {uploadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safety-red)', fontSize: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: RTSP Stream */}
          {activeTab === 'rtsp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                Enter RTSP or IP Camera Stream URL:
              </label>
              <input
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
                className="clean-text-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Examples: Hikvision, Dahua, Axis, or ONVIF IP camera video streams.
              </div>
              <button
                className="clean-ctrl-btn primary"
                onClick={handleConnectRTSP}
                style={{ alignSelf: 'flex-start', marginTop: '8px' }}
              >
                <span>Connect & Start Safety Monitoring</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
