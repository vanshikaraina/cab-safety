import { useState, useRef, useCallback } from "react";

export const useVideoRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // rear cam default
  const [recordings, setRecordings] = useState([]);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const videoPreviewRef = useRef(null); // attach to <video> element

  const getStream = useCallback(async (facing) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing },
      audio: true, // audio baked into video
    });
    streamRef.current = stream;
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await getStream(facingMode);
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

        recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const name = `recording_${Date.now()}.webm`;

        // Upload to backend
        try {
            const now = new Date();
            const formData = new FormData();
            formData.append("video", blob, name);
            formData.append("date", now.toLocaleDateString());
            formData.append("startTime", new Date(now - chunksRef.current.length * 1000).toLocaleTimeString());
            formData.append("endTime", now.toLocaleTimeString());
            formData.append("duration", chunksRef.current.length); // approx seconds

            const token = localStorage.getItem("token");
            await fetch("https://cab-safety.onrender.com/api/video-recordings/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
            });
        } catch (err) {
            console.error("Upload failed:", err);
        }

        setRecordings((prev) => [...prev, { url, name, blob, timestamp: new Date() }]);
        };

      recorder.start(1000); // collect chunks every 1s
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(err.message || "Camera access denied");
    }
  }, [facingMode, getStream]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    setIsRecording(false);
  }, []);

  const flipCamera = useCallback(async () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    if (isRecording) {
      // re-acquire stream mid-recording (replaces tracks)
      const newStream = await getStream(newFacing);
      // swap tracks on existing recorder
      const videoTrack = newStream.getVideoTracks()[0];
      const sender = streamRef.current?.getVideoTracks()[0];
      if (sender && videoTrack) {
        streamRef.current.removeTrack(sender);
        streamRef.current.addTrack(videoTrack);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = newStream;
        }
      }
    }
  }, [facingMode, isRecording, getStream]);

  const downloadRecording = (rec) => {
    const a = document.createElement("a");
    a.href = rec.url;
    a.download = rec.name;
    a.click();
  };

  return {
    isRecording,
    recordings,
    error,
    facingMode,
    videoPreviewRef,
    startRecording,
    stopRecording,
    flipCamera,
    downloadRecording,
  };
};