import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: "var(--bg-root)", color: "var(--text-primary)" }}
    >
      <h1 className="text-2xl font-bold mb-2">Resource not found</h1>
      <p className="text-sm mb-6 max-w-md" style={{ color: "var(--text-secondary)" }}>
        The requested quality record or study could not be loaded from the API.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Back to dashboard
      </Link>
    </div>
  );
}
