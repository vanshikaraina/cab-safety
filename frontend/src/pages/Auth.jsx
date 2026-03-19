import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/auth.css";

function Auth() {

	const navigate = useNavigate();
	const location = useLocation();

	const params = new URLSearchParams(location.search);
	const mode = params.get("mode");

	const [isLogin, setIsLogin] = useState(mode !== "signup");
	const [showPopup, setShowPopup] = useState(false);
	const [showSignupPopup, setShowSignupPopup] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [confirmChecked, setConfirmChecked] = useState(false);

	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		age: "",
		contactNumber: "",
		email: "",
		password: ""
	});

	const rules = {
		length: /.{8,}/,
		lowercase: /[a-z]/,
		uppercase: /[A-Z]/,
		number: /[0-9]/,
		special: /[!@#$%^&*(),.?":{}|<>]/
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const getPasswordStatus = () => {
		return {
			length: rules.length.test(formData.password),
			lowercase: rules.lowercase.test(formData.password),
			uppercase: rules.uppercase.test(formData.password),
			number: rules.number.test(formData.password),
			special: rules.special.test(formData.password)
		};
	};

	const getPasswordStrength = (status) => {
		const passed = Object.values(status).filter(Boolean).length;

		if (passed <= 2) return "Weak";
		if (passed === 3 || passed === 4) return "Medium";
		if (passed === 5) return "Strong";
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {

			if (isLogin) {

				const res = await axios.post(
					"https://cab-safety.onrender.com/api/auth/login",
					{
						email: formData.email,
						password: formData.password
					}
				);

				localStorage.setItem("token", res.data.token);
				setShowPopup(true);

			} else {

				await axios.post(
					"https://cab-safety.onrender.com/api/auth/signup",
					formData
				);

				setShowSignupPopup(true);

			}

		} catch (error) {

			alert(error.response?.data?.message || "Something went wrong");

		}

	};

	const handleConfirm = () => {
		if (confirmChecked) {
			navigate("/dashboard");
		}
	};

	const status = getPasswordStatus();
	const strength = getPasswordStrength(status);

	return (

		<div className="auth-container">

			<div className="auth-box">

				<h2>{isLogin ? "Login" : "Sign Up"}</h2>

				<form onSubmit={handleSubmit}>

					{!isLogin && (
						<> <input name="firstName" placeholder="First Name" onChange={handleChange} required />

							<input name="lastName" placeholder="Last Name" onChange={handleChange} required />

							<input name="age" type="number" placeholder="Age (optional)" onChange={handleChange} />

							<input name="contactNumber" placeholder="Contact Number" onChange={handleChange} required />
						</>
					)}

					<input
						name="email"
						type="email"
						placeholder="Email"
						onChange={handleChange}
						required
					/>

					{isLogin ? (

						<div className="password-wrapper">
							<input
								name="password"
								type={showPassword ? "text" : "password"}
								placeholder="Password"
								onChange={handleChange}
								required
							/>

							<span
								className="toggle-password"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? "Hide" : "Show"}
							</span>
						</div>

					) : (

						<div className="password-wrapper">

							<input
								name="password"
								type={showPassword ? "text" : "password"}
								placeholder="Password"
								onChange={handleChange}
								required
							/>

							<span
								className="toggle-password"
								onClick={() => setShowPassword(!showPassword)}

							>

								{showPassword ? "Hide" : "Show"} </span>

						</div>

					)}

					{!isLogin && formData.password && (

						<div className="password-info">

							<p className={`strength ${strength?.toLowerCase()}`}>
								Strength: {strength}
							</p>

							<div className="password-rules">

								<p style={{ color: status.length ? "green" : "orange" }}>
									{status.length ? "✓" : "•"} At least 8 characters
								</p>

								<p style={{ color: status.lowercase ? "green" : "orange" }}>
									{status.lowercase ? "✓" : "•"} Lowercase letter
								</p>

								<p style={{ color: status.uppercase ? "green" : "orange" }}>
									{status.uppercase ? "✓" : "•"} Uppercase letter
								</p>

								<p style={{ color: status.number ? "green" : "orange" }}>
									{status.number ? "✓" : "•"} Number
								</p>

								<p style={{ color: status.special ? "green" : "orange" }}>
									{status.special ? "✓" : "•"} Special character
								</p>

							</div>

						</div>

					)}

					<button type="submit">
						{isLogin ? "Login" : "Sign Up"}
					</button>

				</form>

				<p>
					{isLogin ? "Don't have an account?" : "Already have an account?"}

					<span onClick={() => setIsLogin(!isLogin)}>
						{isLogin ? " Sign Up" : " Login"} </span>

				</p>

				<button onClick={() => navigate("/")}>
					Back </button>

			</div>

			{showPopup && (

				<div className="popup-overlay">

					<div className="popup-box">

						<h3>Login Successful</h3>
						<p>Confirm to continue to dashboard</p>

						<label className="confirm-check">
							<input
								type="checkbox"
								onChange={(e) => setConfirmChecked(e.target.checked)}
							/>
							Continue to Dashboard
						</label>

						<button className="popup-btn" onClick={handleConfirm}>
							Continue
						</button>

					</div>

				</div>
			)}

			{showSignupPopup && (

				<div className="popup-overlay">

					<div className="popup-box">

						<h3>Signup Successful 🎉</h3>
						<p>Your account has been created. Please login.</p>

						<button
							className="popup-btn"
							onClick={() => {
								setShowSignupPopup(false);
								setIsLogin(true);
							}}

						>

							Continue </button>

					</div>

				</div>
			)}

		</div>

	);
}

export default Auth;
