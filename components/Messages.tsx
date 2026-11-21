export default function Messages({ error, ok }: { error?: string; ok?: string }) {
  return (
    <>
      {error && <div className="msg err" role="alert">{error}</div>}
      {ok && <div className="msg ok" role="status">{ok}</div>}
    </>
  );
}
