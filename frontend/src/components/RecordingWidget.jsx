import "../styles/recordingWidget.css";
import { useRecording } from "../context/RecordingContext";

const RecordingWidget = () => {

  const { stopRecording } = useRecording();

  return (

    <div className="recording-widget">

      <div className="record-dot"></div>

      <span>Recording...</span>

      <button className="record-btn" onClick={stopRecording}>
        Stop
      </button>

    </div>

  );

};

export default RecordingWidget;