import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postalCode } = await request.json();

    console.log('Resolving postal code:', postalCode);

    if (!postalCode) {
      return NextResponse.json(
        { error: 'postalCode is required' },
        { status: 400 }
      );
    }

    // 郵便番号形式チェック
    const cleanedCode = postalCode.replace('-', '');
    if (!/^\d{7}$/.test(cleanedCode)) {
      return NextResponse.json(
        { error: 'Invalid postal code format', received: cleanedCode },
        { status: 400 }
      );
    }

    const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedCode}`;
    console.log('Fetching:', url);

    const response = await fetch(url);

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('zipcloud error:', errorText);
      return NextResponse.json(
        { error: 'Failed to resolve postal code', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('zipcloud response:', data);

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { success: false, error: '郵便番号が正しくありません' },
        { status: 404 }
      );
    }

    const result = data.results[0];

    if (!result.address1 || !result.address2) {
      return NextResponse.json(
        { success: false, error: '郵便番号が正しくありません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      prefecture: result.address1,
      city: result.address2,
      address3: result.address3 || null,
    });
  } catch (error) {
    console.error('Postal code resolution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
