import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SearchPlacesRequest {
  keyword: string;
  city: string;
  prefecture: string;
  depth?: number;
}

interface PlaceResult {
  rank: number;
  title: string;
  address: string;
  phone: string;
  placeId: string;
  rating: number | null;
  votes: number | null;
  latitude: number;
  longitude: number;
  mainImage: string | null;
  category: string | null;
  url: string | null;
  contactUrl: string | null;
  bookOnlineUrl: string | null;
  workHours: any;
  rawData: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchPlacesRequest = await request.json();

    const { keyword, city, prefecture, depth = 10 } = body;

    if (!keyword || !city || !prefecture) {
      return NextResponse.json(
        { error: 'keyword, city, prefecture are required' },
        { status: 400 }
      );
    }

    // depth の検証（1〜100）
    const validDepth = Math.max(1, Math.min(depth, 100));

    // キーワードに地域を組み込む
    const searchKeyword = `${prefecture}${city} ${keyword}`;

    // Supabase クライアント初期化（キャッシュ用）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // キャッシュを検索
    const { data: cachedData } = await supabase
      .from('search_cache')
      .select('results')
      .eq('prefecture', prefecture)
      .eq('city', city)
      .eq('keyword', keyword)
      .eq('depth', validDepth)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData) {
      console.log('Cache hit:', { prefecture, city, keyword, depth: validDepth });
      // キャッシュから results を復元
      const cachedResults = cachedData.results as PlaceResult[];
      return NextResponse.json({
        success: true,
        results: cachedResults,
        searchKeyword,
        cached: true,
        debug: {
          cacheHit: true,
        },
      });
    }

    // DataForce API 認証
    const auth = process.env.DATAFORCE_AUTH;
    if (!auth) {
      return NextResponse.json(
        { error: 'DataForce API key not configured' },
        { status: 500 }
      );
    }

    // DataForce API リクエスト
    const dataforceRequest = [
      {
        api: 'serp',
        function: 'live',
        se: 'google',
        se_type: 'maps',
        keyword: searchKeyword,
        location_code: 2392,
        language_code: 'ja',
        device: 'mobile',
        os: 'ios',
        depth: validDepth,
        search_places: false,
      },
    ];

    const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataforceRequest),
    });

    if (!response.ok) {
      console.error('DataForce API error:', response.status, await response.text());
      return NextResponse.json(
        { error: 'Failed to search places' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // デバッグ用ログ
    console.log('DataForce API Response:', JSON.stringify(data, null, 2));

    // レスポンス解析
    const results: PlaceResult[] = [];
    const categories = new Set<string>(); // API category を蓄積

    // DataForce API v3 レスポンス構造: data.tasks[0].result[0].items
    if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
      const task = data.tasks[0];

      if (task.result && Array.isArray(task.result) && task.result.length > 0) {
        const responseData = task.result[0];

        if (responseData.items && Array.isArray(responseData.items)) {
          responseData.items.forEach((item: any, index: number) => {
            results.push({
              rank: index + 1,
              title: item.title || '',
              address: item.address || '',
              phone: item.phone || '',
              placeId: item.place_id || '',
              rating: item.rating?.value || null,
              votes: item.rating?.votes_count || null,
              latitude: item.latitude || 0,
              longitude: item.longitude || 0,
              mainImage: item.main_image || null,
              category: item.category || null,
              url: item.url || null,
              contactUrl: item.contact_url || null,
              bookOnlineUrl: item.book_online_url || null,
              workHours: item.work_hours || null,
              rawData: item, // 後で使う可能性のため全データ保存
            });

            // category を蓄積
            if (item.category) {
              categories.add(item.category);
            }
          });
        }
      }
    }

    // category_mapping に category を記録（重複は無視）
    if (categories.size > 0) {
      const categoriesToInsert = Array.from(categories).map((cat) => ({
        api_category: cat,
      }));

      try {
        await supabase
          .from('category_mapping')
          .upsert(categoriesToInsert, { onConflict: 'api_category' });
      } catch (catErr) {
        // category 記録失敗は API レスポンスに影響させない
        console.error('Category mapping error:', catErr);
      }
    }

    // キャッシュに保存（1時間有効）
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    try {
      await supabase
        .from('search_cache')
        .insert({
          prefecture,
          city,
          keyword,
          depth: validDepth,
          results,
          expires_at: expiresAt.toISOString(),
        });
    } catch (cacheErr) {
      // キャッシュ保存失敗は API レスポンスに影響させない
      console.error('Cache save error:', cacheErr);
    }

    return NextResponse.json({
      success: true,
      results,
      searchKeyword,
      cached: false,
      debug: {
        tasksCount: data?.tasks_count,
        hasTask: data?.tasks && data.tasks.length > 0 ? true : false,
        itemsLength: data?.tasks?.[0]?.result?.[0]?.items?.length,
        rawResponse: data, // デバッグ用
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
