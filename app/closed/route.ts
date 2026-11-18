import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function closed() {
  return NextResponse.json(
    { error: "This app is closed." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export { closed as GET, closed as POST, closed as PUT, closed as PATCH,
  closed as DELETE, closed as HEAD, closed as OPTIONS };
