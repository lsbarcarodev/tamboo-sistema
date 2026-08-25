import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    // Usando Photon (komoot) ao invés do Nominatim diretamente para evitar o bloqueio de IP (erro 429) e ter melhor busca
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocode proxy error:', error);
    return NextResponse.json({ error: 'Failed to geocode' }, { status: 500 });
  }
}
