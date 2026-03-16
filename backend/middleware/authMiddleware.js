import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {

  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user id to request
    req.userId = decoded.userId;

    next();

  } catch (err) {

    return res.status(401).json({ message: "Token is not valid" });

  }

};

export default authMiddleware;