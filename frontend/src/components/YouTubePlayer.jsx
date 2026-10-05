import React, { useEffect, useRef } from 'react';

export default function YouTubePlayer({
  videoId,
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onSeek,
  isRemoteAction,
  userRole,
}) {
  const playerRef = useRef(null);
  const isReadyRef = useRef(false);

  // Keep a ref to the latest props so onReady and listeners access current state
  const propsRef = useRef({ videoId, isPlaying, currentTime, userRole });
  useEffect(() => {
    propsRef.current = { videoId, isPlaying, currentTime, userRole };
  });

  useEffect(() => {
    // Load YouTube IFrame API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('yt-player-container', {
        height: '100%',
        width: '100%',
        videoId: propsRef.current.videoId || videoId || 'dQw4w9WgXcQ',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            isReadyRef.current = true;
            const currentVid = propsRef.current.videoId || videoId;
            if (currentVid) {
              try {
                const data = event.target.getVideoData();
                if (!data || data.video_id !== currentVid) {
                  isRemoteAction.current = true;
                  event.target.loadVideoById(currentVid);
                }
              } catch (e) {
                isRemoteAction.current = true;
                event.target.loadVideoById(currentVid);
              }
            }
            if (propsRef.current.currentTime && propsRef.current.currentTime > 0) {
              try {
                event.target.seekTo(propsRef.current.currentTime, true);
              } catch (e) {}
            }
            if (propsRef.current.isPlaying) {
              try {
                event.target.playVideo();
              } catch (e) {}
            } else {
              try {
                event.target.pauseVideo();
              } catch (e) {}
            }
          },
          onStateChange: (event) => {
            const state = event.data;

            // PREVENT INFINITE WEBSOCKET LOOP:
            // If action was programmatic (remote WS event), ignore onStateChange emission
            if (isRemoteAction.current) {
              isRemoteAction.current = false;
              return;
            }

            // Only HOST and MODERATOR emit local playback controls
            const role = propsRef.current.userRole;
            if (role !== 'HOST' && role !== 'MODERATOR') {
              return;
            }

            if (state === window.YT.PlayerState.PLAYING) {
              const cur = playerRef.current ? playerRef.current.getCurrentTime() : 0;
              onPlay(cur);
            } else if (state === window.YT.PlayerState.PAUSED) {
              const cur = playerRef.current ? playerRef.current.getCurrentTime() : 0;
              onPause(cur);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Synchronize Video ID updates dynamically
  useEffect(() => {
    if (playerRef.current && isReadyRef.current && videoId) {
      try {
        const currentData = playerRef.current.getVideoData();
        if (!currentData || currentData.video_id !== videoId) {
          isRemoteAction.current = true;
          playerRef.current.loadVideoById(videoId);
          if (isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        }
      } catch (e) {
        isRemoteAction.current = true;
        playerRef.current.loadVideoById(videoId);
      }
    }
  }, [videoId]);

  // Synchronize Play / Pause state updates dynamically
  useEffect(() => {
    if (playerRef.current && isReadyRef.current) {
      try {
        const playerState = playerRef.current.getPlayerState();
        if (isPlaying && playerState !== window.YT.PlayerState.PLAYING) {
          isRemoteAction.current = true;
          playerRef.current.playVideo();
        } else if (!isPlaying && playerState === window.YT.PlayerState.PLAYING) {
          isRemoteAction.current = true;
          playerRef.current.pauseVideo();
        }
      } catch (e) {}
    }
  }, [isPlaying]);

  // Synchronize Seek / Timestamp updates dynamically
  useEffect(() => {
    if (playerRef.current && isReadyRef.current && currentTime !== undefined && currentTime !== null) {
      try {
        const cur = playerRef.current.getCurrentTime();
        if (Math.abs(cur - currentTime) > 1.5) {
          isRemoteAction.current = true;
          playerRef.current.seekTo(currentTime, true);
        }
      } catch (e) {}
    }
  }, [currentTime]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div id="yt-player-container" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export { YouTubePlayer };
