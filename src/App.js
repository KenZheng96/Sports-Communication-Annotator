import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Upload, Download, Trash2, Camera, Square } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function VideoAnnotator() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gameClockTime, setGameClockTime] = useState('');
  const [ocrRegion, setOcrRegion] = useState(null);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [autoOcrEnabled, setAutoOcrEnabled] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Non-verbal communication action types
  const actionTypes = [
    { id: 'Eye Contact', label: 'Eye Contact', color: 'bg-blue-500' },
    { id: 'Screen', label: 'Screen', color: 'bg-green-500' },
    { id: 'Direct', label: 'Directing', color: 'bg-red-500' },
    { id: 'Call for Ball', label: 'Call for Ball', color: 'bg-purple-500' },
    { id: 'Defensive Swtich', label: 'Defensive Switch', color: 'bg-yellow-500' },
    { id: 'Nod', label: 'Nod', color: 'bg-indigo-500' }
  ];

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && videoRef.current && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
          setIsPlaying(!videoRef.current.paused);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setAnnotations([]);
      setCurrentTime(0);
      setOcrRegion(null);
      setOcrText('');
      setAutoOcrEnabled(false);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const scrubBar = e.currentTarget;
    const rect = scrubBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const addAnnotation = (actionType) => {
    if (!videoRef.current) return;
    
    const timestamp = videoRef.current.currentTime;
    const newAnnotation = {
      id: Date.now(),
      type: actionType.id,
      label: actionType.label,
      color: actionType.color,
      timestamp: timestamp,
      formattedTime: formatTime(timestamp),
      gameClockTime: gameClockTime || 'N/A'
    };
    
    setAnnotations([...annotations, newAnnotation].sort((a, b) => a.timestamp - b.timestamp));
  };

  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
  };

  const seekToAnnotation = (timestamp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // OCR Functions
  const handleMouseDown = (e) => {
    if (!isSelectingRegion || !videoContainerRef.current) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isSelectingRegion || !dragStart || !videoContainerRef.current) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    setOcrRegion({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      width: Math.abs(currentX - dragStart.x),
      height: Math.abs(currentY - dragStart.y)
    });
  };

  const handleMouseUp = () => {
    if (isSelectingRegion && ocrRegion && ocrRegion.width > 10 && ocrRegion.height > 10) {
      setIsSelectingRegion(false);
      setDragStart(null);
      performOcr();
    }
  };

  const startRegionSelection = () => {
    setIsSelectingRegion(true);
    setOcrRegion(null);
    setOcrText('');
  };

  const performOcr = async () => {
    if (!videoRef.current || !ocrRegion) return;
    
    setIsProcessingOcr(true);
    
    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Get video dimensions
      const videoRect = video.getBoundingClientRect();
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;
      
      // Scale OCR region to actual video dimensions
      const scaledRegion = {
        x: ocrRegion.x * scaleX,
        y: ocrRegion.y * scaleY,
        width: ocrRegion.width * scaleX,
        height: ocrRegion.height * scaleY
      };
      
      canvas.width = scaledRegion.width;
      canvas.height = scaledRegion.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        video,
        scaledRegion.x,
        scaledRegion.y,
        scaledRegion.width,
        scaledRegion.height,
        0,
        0,
        scaledRegion.width,
        scaledRegion.height
      );
      
      const { data: { text } } = await Tesseract.recognize(
        canvas.toDataURL(),
        'eng',
        {
          logger: m => console.log(m)
        }
      );
      
      const cleanedText = text.trim();
      setOcrText(cleanedText);
      setGameClockTime(cleanedText);
      
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to perform OCR. Please try again.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Auto OCR every second when enabled
  useEffect(() => {
    if (!autoOcrEnabled || !ocrRegion || !videoRef.current) return;
    
    const runOcr = async () => {
      if (isProcessingOcr) return;
      
      setIsProcessingOcr(true);
      
      try {
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        
        const videoRect = video.getBoundingClientRect();
        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;
        
        const scaledRegion = {
          x: ocrRegion.x * scaleX,
          y: ocrRegion.y * scaleY,
          width: ocrRegion.width * scaleX,
          height: ocrRegion.height * scaleY
        };
        
        canvas.width = scaledRegion.width;
        canvas.height = scaledRegion.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          video,
          scaledRegion.x,
          scaledRegion.y,
          scaledRegion.width,
          scaledRegion.height,
          0,
          0,
          scaledRegion.width,
          scaledRegion.height
        );
        
        const { data: { text } } = await Tesseract.recognize(
          canvas.toDataURL(),
          'eng',
          {
            logger: m => console.log(m)
          }
        );
        
        const cleanedText = text.trim();
        setOcrText(cleanedText);
        setGameClockTime(cleanedText);
        
      } catch (error) {
        console.error('OCR Error:', error);
      } finally {
        setIsProcessingOcr(false);
      }
    };
    
    const interval = setInterval(runOcr, 1000);
    
    return () => clearInterval(interval);
  }, [autoOcrEnabled, ocrRegion, isProcessingOcr]);

  const exportAnnotations = () => {
    const dataStr = JSON.stringify(annotations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'annotations.json';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Hidden file input - always rendered */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*"
        style={{ display: 'none' }}
      />
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Sports Non Verbal Communication
        </h1>

        {/* Upload Section */}
        {!videoSrc && (
          <div className="bg-gray-800 rounded-lg p-12 mb-8 border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors">
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="w-full flex flex-col items-center gap-4 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <Upload size={64} />
              <span className="text-xl">Click to upload video</span>
              <span className="text-sm">Supports MP4, WebM, and other video formats</span>
            </button>
          </div>
        )}

        {/* Video Player Section */}
        {videoSrc && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div 
                ref={videoContainerRef}
                className="relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: isSelectingRegion ? 'crosshair' : 'pointer' }}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handleVideoClick}
                  className="w-full rounded-lg"
                  onEnded={() => setIsPlaying(false)}
                  style={{ pointerEvents: isSelectingRegion ? 'none' : 'auto' }}
                />
                
                {/* OCR Region Overlay */}
                {ocrRegion && (
                  <div
                    className="absolute border-4 border-green-500 bg-green-500 bg-opacity-20"
                    style={{
                      left: `${ocrRegion.x}px`,
                      top: `${ocrRegion.y}px`,
                      width: `${ocrRegion.width}px`,
                      height: `${ocrRegion.height}px`,
                      pointerEvents: 'none'
                    }}
                  >
                    <div className="absolute -top-8 left-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                      Clock Region
                    </div>
                  </div>
                )}
                
                {isSelectingRegion && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm">
                    Draw a box around the game clock
                  </div>
                )}
              </div>
              
              {/* Custom Video Controls */}
              <div className="mt-4 space-y-3">
                {/* Progress Bar */}
                <div 
                  className="relative h-2 bg-gray-700 rounded-full cursor-pointer group"
                  onClick={handleSeek}
                >
                  <div 
                    className="absolute h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  
                  <span className="text-lg font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="ml-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Upload New Video
                  </button>
                </div>
              </div>
            </div>

            {/* OCR Controls */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Game Clock OCR</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startRegionSelection}
                    disabled={isSelectingRegion}
                    className={`${isSelectingRegion ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors`}
                  >
                    <Square size={20} />
                    {ocrRegion ? 'Reselect Clock Region' : 'Select Clock Region'}
                  </button>
                  
                  {ocrRegion && (
                    <>
                      <button
                        onClick={performOcr}
                        disabled={isProcessingOcr}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                      >
                        <Camera size={20} />
                        {isProcessingOcr ? 'Reading...' : 'Read Clock Now'}
                      </button>
                      
                      <button
                        onClick={() => setAutoOcrEnabled(!autoOcrEnabled)}
                        className={`${autoOcrEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} px-4 py-2 rounded-lg font-semibold transition-colors`}
                      >
                        {autoOcrEnabled ? '⏸ Auto-Read ON' : '▶ Auto-Read OFF'}
                      </button>
                    </>
                  )}
                </div>
                
                {ocrText && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Last OCR Result:</div>
                    <div className="text-xl font-bold text-green-400">{ocrText}</div>
                  </div>
                )}
                
                <div className="text-sm text-gray-400">
                  <p>• Select the region where the game clock appears in the video</p>
                  <p>• Use "Read Clock Now" to manually capture the time</p>
                  <p>• Enable "Auto-Read" to automatically read every second</p>
                  <p>• The OCR result will auto-fill the Game Clock field below</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Non-Verbal Communication Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {actionTypes.map(action => (
                  <button
                    key={action.id}
                    onClick={() => addAnnotation(action)}
                    className={`${action.color} hover:opacity-80 px-6 py-4 rounded-lg font-semibold transition-opacity shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              
              {/* Game Clock Input */}
              <div className="mt-6 flex items-center gap-4">
                <label className="text-lg font-semibold">Game Clock:</label>
                <input
                  type="text"
                  value={gameClockTime}
                  onChange={(e) => setGameClockTime(e.target.value)}
                  placeholder="e.g., 10:45 Q2"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg flex-1 max-w-xs border-2 border-gray-600 focus:border-blue-500 outline-none"
                />
                <span className="text-sm text-gray-400">Enter game time before clicking action buttons</span>
              </div>
            </div>

            {/* Annotations Timeline */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Annotations ({annotations.length})</h2>
                {annotations.length > 0 && (
                  <button
                    onClick={exportAnnotations}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Download size={20} />
                    Export
                  </button>
                )}
              </div>
              
              {annotations.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No annotations yet. Click an action button while playing the video to add one.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {annotations.map(ann => (
                    <div
                      key={ann.id}
                      className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors group"
                    >
                      <button
                        onClick={() => seekToAnnotation(ann.timestamp)}
                        className="flex items-center gap-4 flex-1 text-left"
                      >
                        <span className={`${ann.color} px-3 py-1 rounded-full text-sm font-semibold`}>
                          {ann.formattedTime}
                        </span>
                        {ann.gameClockTime && ann.gameClockTime !== 'N/A' && (
                          <span className="bg-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                            {ann.gameClockTime}
                          </span>
                        )}
                        <span className="font-medium">{ann.label}</span>
                      </button>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}