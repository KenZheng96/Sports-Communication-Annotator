import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Upload, Download, Trash2, Volume2, VolumeX } from 'lucide-react';

export default function VideoAnnotator() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gameClockTime, setGameClockTime] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [customAnnotation, setCustomAnnotation] = useState('');
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [exportName, setExportName] = useState('annotations');
  const [team, setTeam] = useState()
  const [teams, setTeams] = useState(["Team A", "Team B"]);
  const [folderFiles, setFolderFiles] = useState([]);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const actionTypes = [
    { id: 'Eye Contact', label: 'Eye Contact', color: 'bg-blue-500' },
    { id: 'Screen', label: 'Screen', color: 'bg-green-500' },
    { id: 'Direct', label: 'Directing', color: 'bg-red-500' },
    { id: 'Call for Ball', label: 'Call for Ball', color: 'bg-purple-500' },
    { id: 'Defensive Switch', label: 'Defensive Switch', color: 'bg-yellow-500' },
    { id: 'Nod', label: 'Nod', color: 'bg-indigo-500' }
  ];

  const teamColors = {
    "Jazz": "#753bbd",
    "Hawks": "#e03a3e",
    "Magic": "#0077c0",
    "Rockets": "#ce1141",
    "Nuggets": "#0e2240",
    "Kings": "#5a2d81",
    "Spurs": "#c4ced4",
    "Warriors": "#1d428a",
    "Thunder": "#ef3b24",
    "Lakers": "#552583"
  }

    const seekBy = useCallback(
    (delta) => {
      if (!videoRef.current) return;
      const newTime = Math.min(
        Math.max(videoRef.current.currentTime + delta, 0),
        duration || 0
      );
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  // Keyboard: space + left/right skip
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!videoRef.current || e.target.matches('input, textarea')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
        setIsPlaying(!videoRef.current.paused);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekBy(3);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekBy(-3);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [seekBy]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setAnnotations([]);
      setCurrentTime(0);
      setPlaybackSpeed(1);
      setVolume(1);
      setPrevVolume(1);
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setExportName(baseName);
    }
  };

  // get the names of the teams from the folder name on upload
  function extractTeamsFromFolderName(folderName) {
    const parts = folderName.split("_");

    // default if something's wrong
    if (parts.length < 2) return ["Team A", "Team B"];

    const teamA = parts[0].replace(/[^a-zA-Z0-9 ]+/g, " ").trim();
    const teamB = parts[1].replace(/[^a-zA-Z0-9 ]+/g, " ").trim();

    return [capitalizeWords(teamA), capitalizeWords(teamB)];
  }

  // capitalize the team names
  function capitalizeWords(str) {
    return str
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  // sorts the files in the folder window from the start of the game
  function sortFiles(files) {
    return [...files].sort((a, b) => {
      const parse = (file) => {
        const name = file.name.replace(/\.[^/.]+$/, ""); // remove extension
        const parts = name.split("_");

        // Expect: ["Q1", "-", "115700", ...]
        const quarterPart = parts[0];   // "Q1"
        const timePart = parts[2];      // "115700"

        // Extract quarter number
        const quarterMatch = quarterPart.match(/Q(\d+)/i);
        const quarter = quarterMatch ? parseInt(quarterMatch[1], 10) : 99;

        // Time is a string like "115700", convert safely to integer
        const time = parseInt(timePart, 10) || 0;

        return { quarter, time };
      };

      const A = parse(a);
      const B = parse(b);

      // Sort first by quarter, then by time within quarter
      if (A.quarter !== B.quarter) return A.quarter - B.quarter;
      return B.time - A.time;
    });
  }


  const handleFolderSelect = (e) => {
    const files = Array.from(e.target.files);
    setFolderFiles(sortFiles(files));

    if (files.length > 0) {
      // Get the folder name from first file’s path
      const folderName = files[0].webkitRelativePath.split("/")[0];

      const [team1, team2] = extractTeamsFromFolderName(folderName);

      setTeams([team1, team2]);  // update team selection buttons
      setTeam(team1);            // default selected team
    }
  }

  // loads video into player once its chosen from folder window
  const loadVideoFromFile = (file) => {
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setAnnotations([]);
    setCurrentTime(0);
    setPlaybackSpeed(1);
    setVolume(1);
    setPrevVolume(1);
    setExportName(url);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setExportName(baseName);
  };


  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => handlePlayPause();

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.volume = volume;
      videoRef.current.muted = volume === 0;
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };


  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (newVolume > 0) setPrevVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (volume === 0) {
      handleVolumeChange(prevVolume || 1);
    } else {
      setPrevVolume(volume);
      handleVolumeChange(0);
    }
  };

  // ADDING ANNOTATIONS — keep color in state (for UI) but strip on export
  const addAnnotation = (actionType) => {
    if (!videoRef.current) return;
    const timestamp = videoRef.current.currentTime;
    const newAnnotation = {
      id: Date.now(),
      type: actionType.id,
      label: actionType.label,
      color: actionType.color,          // keep color for UI
      timestamp,
      formattedTime: formatTime(timestamp),
      gameClockTime: gameClockTime || 'N/A',
      team
    };
    setAnnotations([newAnnotation, ...annotations]);
  };

  const addCustomAnnotation = () => {
    if (!videoRef.current || !customAnnotation.trim()) return;
    const timestamp = videoRef.current.currentTime;
    const newAnnotation = {
      id: Date.now(),
      type: 'Other',
      label: customAnnotation.trim(),
      color: 'bg-gray-500',            // neutral color for custom actions
      timestamp,
      formattedTime: formatTime(timestamp),
      gameClockTime: gameClockTime || 'N/A',
      team
    };
    setAnnotations([newAnnotation, ...annotations]);
    setCustomAnnotation('');
  };

  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  const seekToAnnotation = (timestamp) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestamp;
    setCurrentTime(timestamp);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // EXPORT HELPERS — remove color here only
  const getSafeExportName = (ext) => {
    const base = exportName.trim() !== '' ? exportName.trim() : 'annotations';
    return `${base}.${ext}`;
  };

  const getCleanAnnotations = () =>
    annotations.map(({ color, ...rest }) => rest); // strips color only for export

  const exportAnnotationsJSON = () => {
    const cleanAnnotations = getCleanAnnotations();
    const dataStr = JSON.stringify(cleanAnnotations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeExportName('json');
    link.click();
  };

  const exportAnnotationsCSV = () => {
    const cleanAnnotations = getCleanAnnotations();
    const headers = ['id', 'type', 'label', 'timestamp', 'formattedTime', 'gameClockTime', 'team'];

    const escape = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = cleanAnnotations.map((ann) =>
      headers.map((field) => escape(ann[field])).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeExportName('csv');
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*"
        style={{ display: 'none' }}
      />

      <input
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        ref={folderInputRef}
        onChange={handleFolderSelect}
        style={{ display: 'none' }}
      />

      <div className="max-w-full mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Sports Non Verbal Communication
        </h1>

        {folderFiles.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-12 mb-8 border-2 border-dashed border-gray-600 hover:border-blue-500 transition">
            <button
              onClick={() => folderInputRef.current && folderInputRef.current.click()}
              className="w-full flex flex-col items-center gap-4 text-gray-400 hover:text-blue-400"
            >
              <Upload size={64} />
              <span className="text-xl">Click to select folder</span>
              <span className="text-sm">All files inside the folder will be displayed</span>
            </button>
          </div>
        )}

        {folderFiles.length > 0 && (
          <div className="flex gap-4">
            {/* LEFT SIDE */}
            <div className="flex-[7] flex flex-col gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handleVideoClick}
                  className="w-full rounded-lg cursor-pointer"
                  style={{ maxHeight: '60vh' }}
                  onEnded={() => setIsPlaying(false)}
                />

                {!videoSrc && (
                  <div className="text-gray-400 text-lg text-center">
                    No file selected.<br />
                    <span className="text-lg text-gray-400">Please choose a file from the folder window or upload a file.</span>
                  </div>
                )}

                {/* PLAYER CONTROLS */}
                <div className="mt-2 space-y-2">
                  <div
                    className="relative h-2 bg-gray-700 rounded-full cursor-pointer group"
                    onClick={handleSeek}
                  >
                    <div
                      className="absolute h-full bg-red-600 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayPause}
                      className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <span className="text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* SPEED */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Speed:</span>
                      <select
                        value={playbackSpeed}
                        onChange={(e) => handleSpeedChange(Number(e.target.value))}
                        className="bg-gray-700 text-white px-2 py-1 text-sm rounded border-2 border-gray-600 focus:border-blue-500"
                      >
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                          <option key={s} value={s}>
                            {s}x
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* VOLUME */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full"
                      >
                        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-24 accent-blue-400"
                      />
                    </div>

                    <button
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="ml-auto bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm rounded flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Upload
                    </button>
                  </div>
                </div>
              </div>

              {/* ANNOTATIONS */}
              <div className="bg-gray-800 rounded-lg p-3 flex flex-col min-h-[260px] max-h-[360px]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">
                    Annotations ({annotations.length})
                  </h2>

                  {annotations.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={exportAnnotationsJSON}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 text-xs rounded flex items-center gap-1"
                      >
                        <Download size={14} />
                        JSON
                      </button>
                      <button
                        onClick={exportAnnotationsCSV}
                        className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 text-xs rounded flex items-center gap-1 text-black font-semibold"
                      >
                        <Download size={14} />
                        CSV
                      </button>
                    </div>
                  )}
                </div>

                {/* EXPORT NAME INPUT */}
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-gray-300">Export name:</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="e.g., hawks-jazz-q1"
                    className="bg-gray-700 text-white px-2 py-1 text-xs rounded border border-gray-600 focus:border-blue-500 flex-1"
                  />
                </div>

                {annotations.length === 0 ? (
                  <p className="text-gray-400 text-center py-6 text-sm">
                    No annotations yet.
                  </p>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {annotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="bg-gray-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-600 transition group"
                      >
                        <button
                          onClick={() => seekToAnnotation(ann.timestamp)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className={`${ann.color} px-2 py-1 rounded-full text-xs font-semibold`}>
                            {ann.formattedTime}
                          </span>

                          {ann.gameClockTime && ann.gameClockTime !== 'N/A' && (
                            <span className="bg-orange-600 px-2 py-1 rounded-full text-xs font-semibold">
                              {ann.gameClockTime}
                            </span>
                          )}

                          <span className="font-medium text-sm">
                            {ann.label}
                          </span>

                        </button>

                        <button
                          onClick={() => deleteAnnotation(ann.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE — ACTION BUTTONS */}
            <div className="flex-[3] overflow-y-auto">
              {/* TEAM SELECTORS */}
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <h3 className="text-sm font-bold mb-2">Team</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {teams.map((t) => {
                    const color = teamColors[t];
                    const isActive = (team === t);

                    return (
                      <button
                        key={t}
                        onClick={() => setTeam(t)}
                        style={{
                          backgroundColor: isActive ? color : "#444",
                          border: `2px solid ${color}`,
                        }}
                        className={`px-3 py-2 rounded font-bold text-white hover:opacity-90`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3 sticky top-0">
                <h2 className="text-lg font-bold mb-3">
                  Non-Verbal Communication Actions
                </h2>

                <div className="grid grid-cols-2 gap-2">
                  {actionTypes.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => addAnnotation(action)}
                      className={`${action.color} hover:opacity-80 px-3 py-3 text-base rounded font-bold`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* CUSTOM ANNOTATION */}
                <div className="mt-3 p-2 bg-gray-700 rounded">
                  <h3 className="text-sm font-bold mb-2">Custom Annotation</h3>
                  <input
                    type="text"
                    value={customAnnotation}
                    onChange={(e) => setCustomAnnotation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomAnnotation()}
                    placeholder="Type custom action"
                    className="bg-gray-600 text-white px-2 py-2 text-sm rounded w-full mb-2 border border-gray-500 focus:border-purple-500"
                  />
                  <button
                    onClick={addCustomAnnotation}
                    disabled={!customAnnotation.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-2 text-sm rounded font-bold"
                  >
                    Add Other
                  </button>
                </div>

                {/* GAME CLOCK */}
                <div className="mt-3 p-2 bg-gray-700 rounded">
                  <label className="text-sm font-bold block mb-2">
                    Game Clock:
                  </label>
                  <input
                    type="text"
                    value={gameClockTime}
                    onChange={(e) => setGameClockTime(e.target.value)}
                    placeholder="e.g., 10:45 Q2"
                    className="bg-gray-600 text-white px-2 py-2 text-sm rounded w-full border border-gray-500 focus:border-blue-500"
                  />
                </div>

                {/* FOLDER UPLOAD */}
                  <div className="bg-gray-800 rounded-lg p-3 mt-4">
                    <button
                      onClick={() => folderInputRef.current && folderInputRef.current.click()}
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm rounded flex items-center gap-2"
                    >
                      Choose Folder
                    </button>
                    <h2 className="text-lg font-bold mb-2">Folder Contents</h2>

                    {folderFiles.length === 0 && (
                      <p className="text-gray-400 text-sm">No folder selected.</p>
                    )}
                    {folderFiles.length > 0 && (
                      <ul className="text-sm max-h-48 overflow-y-auto space-y-1">
                        {folderFiles.map((file, idx) => (
                          <li
                            key={idx}
                            onClick={() => loadVideoFromFile(file)}
                            className="text-gray-300 cursor-pointer hover:text-blue-400"
                          >
                            {file.webkitRelativePath || file.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}