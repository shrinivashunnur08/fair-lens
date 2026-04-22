import { useRef } from "react";
import toast from "react-hot-toast";

const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

export default function FairnessCertificate({ analysis }) {
  const canvasRef = useRef(null);
  const grade = analysis?.results?.fairnessScore?.grade || "?";
  const score = analysis?.results?.fairnessScore?.score || 0;
  const fileName = analysis?.fileName || "Dataset";
  const flaggedCount = analysis?.results?.flaggedAttributes || 0;
  const color = gradeColor(grade);
  const date = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 900;
    canvas.height = 600;

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 900, 600);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 860, 560);

    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, 840, 540);

    // Header
    ctx.fillStyle = color;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("FAIRLENS — AI BIAS AUDIT CERTIFICATE", 450, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Arial";
    ctx.fillText("Fairness Compliance Report", 450, 160);

    // Grade circle
    ctx.beginPath();
    ctx.arc(450, 300, 90, 0, Math.PI * 2);
    ctx.fillStyle = `${color}15`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText(grade, 450, 325);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px Arial";
    ctx.fillText(`${score}/100`, 450, 360);

    // Dataset info
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText(`Dataset: ${fileName}`, 450, 430);

    ctx.fillStyle = "#64748b";
    ctx.font = "13px Arial";
    ctx.fillText(
      `${flaggedCount === 0 ? "✓ No bias violations detected" : `${flaggedCount} attribute(s) flagged for review`}`,
      450,
      460,
    );
    ctx.fillText(`Analyzed on ${date}`, 450, 490);
    ctx.fillText(
      "Powered by Gemini 2.5 Flash · Google Cloud · fairlens.web.app",
      450,
      520,
    );

    // Footer line
    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 505);
    ctx.lineTo(700, 505);
    ctx.stroke();

    // Download
    const link = document.createElement("a");
    link.download = `FairLens_Certificate_${fileName.replace(".csv", "")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Certificate downloaded!");
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button onClick={downloadCertificate} className="btn-ghost text-sm">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        Download Certificate
      </button>
    </>
  );
}
