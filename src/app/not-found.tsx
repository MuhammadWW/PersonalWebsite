import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="content-over grid min-h-[80vh] place-items-center pt-16">
      <div className="wrap text-center">
        <p className="label muted mb-4">404</p>
        <h1 className="display-l">Page not found</h1>
        <p className="lead muted mx-auto mt-6 max-w-[40ch]">The link may be out of date.</p>
        <Link href="/" className="btn btn-primary mt-10">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
