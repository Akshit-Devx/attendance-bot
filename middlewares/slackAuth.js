import crypto from "crypto";

const verifySlackRequest = (req, res, next) => {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = JSON.stringify(req.body);
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (signature !== computedSignature) {
    return res.status(400).send("❌ Invalid request signature");
  }
  next();
};

export default verifySlackRequest;
