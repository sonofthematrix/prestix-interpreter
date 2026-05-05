// DISABLED: NextAuth API routes in reown-appkit-module
// This module should use the parent application's NextAuth configuration
// These routes are disabled to prevent authentication conflicts

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Authentication not available',
      message: 'This module uses the parent application\'s authentication system'
    },
    { status: 501 } // Not Implemented
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Authentication not available',
      message: 'This module uses the parent application\'s authentication system'
    },
    { status: 501 } // Not Implemented
  );
}
