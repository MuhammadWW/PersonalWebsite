import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="content-over grid min-h-[80vh] place-items-center pt-16">
      <div className="wrap text-center">
        <p className="label muted mb-6">404 · Signal lost</p>
        <h1 className="display-l">This page drifted out of orbit.</h1>
        <p className="lead mx-auto mt-6 max-w-[40ch] muted">The link may be old, or the page never existed.</p>
        <Link href="/" className="pill mt-10">
          <span>Back to home</span>
        </Link>
      </div>
    </main>
  );
}
