const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser({
  customFields: {
    item: ['description', 'content:encoded', 'pubDate']
  }
});

// UI112 맞춤 RSS 설정
const RSS_FEEDS = [
  {
    url: 'https://rss.blog.naver.com/zhstjxm2001.xml',
    platform: '네이버 블로그',
    defaultCategory: 'AEO 트렌드 분석'
  },
  {
    url: 'https://api.velog.io/rss/@airism',
    platform: '벨로그',
    defaultCategory: 'AEO 기술 리포트'
  }
];

async function updatePosts() {
  console.log('🚀 AEO 블로그 RSS 피드 업데이트 시작...');
  
  let allPosts = [];
  
  for (const feed of RSS_FEEDS) {
    try {
      console.log(`📖 ${feed.platform} RSS 파싱 중...`);
      const parsedFeed = await parser.parseURL(feed.url);
      
      if (parsedFeed.items && parsedFeed.items.length > 0) {
        const latestPost = parsedFeed.items[0];
        
        // 카테고리 자동 분류
        let category = feed.defaultCategory;
        let cleanTitle = latestPost.title;
        
        // 제목 기반 카테고리 분류
        if (cleanTitle.includes('트렌드') || cleanTitle.includes('분석') || cleanTitle.includes('인사이트')) {
          category = 'AEO 트렌드 분석';
        } else if (cleanTitle.includes('기술') || cleanTitle.includes('구현') || cleanTitle.includes('최적화') || cleanTitle.includes('케이스')) {
          category = 'AEO 기술 리포트';
        }
        
        // 제목에서 불필요한 태그 제거
        cleanTitle = cleanTitle.replace(/\[.*?\]/g, '').trim();
        
        // 설명 정리 (HTML 태그 제거 후 120자 제한)
        let description = '';
        if (latestPost.contentSnippet) {
          description = latestPost.contentSnippet;
        } else if (latestPost.description) {
          description = latestPost.description;
        } else if (latestPost['content:encoded']) {
          description = latestPost['content:encoded'];
        }
        
        description = description
          .replace(/<[^>]*>/g, '') // HTML 태그 제거
          .replace(/&[^;]+;/g, ' ') // HTML 엔티티 제거
          .replace(/\s+/g, ' ') // 여러 공백을 하나로
          .trim()
          .substring(0, 120);
        
        if (description.length >= 120) {
          description += '...';
        }
        
        // 발행 날짜 포맷팅
        const publishedDate = latestPost.pubDate ? 
          new Date(latestPost.pubDate).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];
        
        allPosts.push({
          category: category,
          title: cleanTitle || '제목 없음',
          description: description || 'AEO 최적화에 대한 인사이트를 제공합니다.',
          link: latestPost.link,
          platform: feed.platform,
          publishedAt: publishedDate
        });
        
        console.log(`✅ ${feed.platform} 최신 글: "${cleanTitle}"`);
      } else {
        console.log(`⚠️ ${feed.platform}: RSS 피드에 글이 없습니다.`);
      }
    } catch (error) {
      console.error(`❌ ${feed.platform} RSS 파싱 실패:`, error.message);
      
      // 에러 발생 시 기본 데이터 추가
      allPosts.push({
        category: feed.defaultCategory,
        title: `최신 ${feed.platform} 포스트`,
        description: 'AEO 최적화 관련 최신 인사이트를 확인해보세요.',
        link: feed.platform === '네이버 블로그' ? 
          'https://blog.naver.com/zhstjxm2001' : 
          'https://velog.io/@airism',
        platform: feed.platform,
        publishedAt: new Date().toISOString().split('T')[0]
      });
    }
  }
  
  // posts.json 파일 업데이트
  const postsData = {
    lastUpdated: new Date().toISOString(),
    totalPosts: allPosts.length,
    posts: allPosts.slice(0, 2) // 최신 2개만 유지
  };
  
  fs.writeFileSync('posts.json', JSON.stringify(postsData, null, 2), 'utf8');
  console.log('📝 posts.json 업데이트 완료!');
  console.log(`📊 업데이트된 포스트: ${postsData.posts.length}개`);
  
  // 업데이트 결과 출력
  postsData.posts.forEach((post, index) => {
    console.log(`${index + 1}. [${post.category}] ${post.title} (${post.platform})`);
  });
}

updatePosts().catch(error => {
  console.error('💥 업데이트 중 오류 발생:', error);
  process.exit(1);
});
