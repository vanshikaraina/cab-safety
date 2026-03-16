import {useSafetyMode} from "../context/SafetyModeContext";

const SafetyIndicator=()=>{
const{safetyMode}=useSafetyMode();
if(!safetyMode)return null;
return(
<div style={{
position:"fixed",
top:"20px",
left:"20px",
background:"rgba(20,30,45,0.9)",
padding:"8px 12px",
borderRadius:"10px",
fontSize:"18px",
zIndex:999
}}>
🛡
</div>
);
};
export default SafetyIndicator;