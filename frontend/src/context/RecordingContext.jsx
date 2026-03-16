import { createContext, useContext, useState } from "react";
import authFetch from "../utils/authFetch";

const RecordingContext = createContext();

export const RecordingProvider = ({ children }) => {

  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);

  const startRecording = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);

      let chunks = [];
      const startTime = new Date();

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {

        const endTime = new Date();

        const blob = new Blob(chunks, { type: "audio/webm" });

        const duration = Math.floor((endTime - startTime) / 1000);

        const formData = new FormData();

        formData.append("audio", blob);
        formData.append("date", startTime.toLocaleDateString());
        formData.append("startTime", startTime.toLocaleTimeString());
        formData.append("endTime", endTime.toLocaleTimeString());
        formData.append("duration", duration);

        await authFetch("/api/recordings/upload", {
          method: "POST",
          body: formData
        });

        // stop microphone
        stream.getTracks().forEach(track => track.stop());

      };

      mediaRecorder.start();

      setRecorder(mediaRecorder);
      setIsRecording(true);

    } catch (err) {

      console.error(err);
      alert("Microphone permission denied");

    }

  };

  const stopRecording = () => {

    if (recorder) {
      recorder.stop();
      setRecorder(null);
      setIsRecording(false);
    }

  };

  return (

    <RecordingContext.Provider
      value={{
        isRecording,
        startRecording,
        stopRecording
      }}
    >
      {children}
    </RecordingContext.Provider>

  );

};

export const useRecording = () => useContext(RecordingContext);