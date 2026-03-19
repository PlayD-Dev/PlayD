import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

/**
 * GET /api/qrcode?eventId=abc123
 *
 * Returns a QR code PNG image that points to the guest join URL for an event.
 * The DJ displays this on screen — guests scan it to join the event.
 *
 * Example response: image/png
 */
export async function GET(req: NextRequest) {
  const eventId   = req.nextUrl.searchParams.get('eventId')?.trim()
  const joinCode  = req.nextUrl.searchParams.get('joinCode')?.trim()

  if (!eventId && !joinCode) {
    return NextResponse.json(
      { error: 'Provide either eventId or joinCode' },
      { status: 400 },
    )
  }

  // Build the URL guests will land on after scanning
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const guestUrl  = eventId
    ? `${baseUrl}/join/${eventId}`
    : `${baseUrl}/join?code=${joinCode}`

  try {
    const pngBuffer = await QRCode.toBuffer(guestUrl, {
      errorCorrectionLevel: 'M',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Cache for 1 hour — the URL for an event never changes
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[/api/qrcode]', err)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
