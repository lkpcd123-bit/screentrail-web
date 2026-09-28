# ScreenTrail 웹

윈도우용 무료 화면 캡처 프로그램

- 🌐 웹사이트: https://screentrail-app.vercel.app/
- 📦 소스코드: https://github.com/lkpcd123-bit/screentrail-web
- ✍️ 소개 글: https://ankotseu.blogspot.com/2026/09/blog-post.html

## 다운로드
최신 버전은 [Releases](https://github.com/ikk5515/ScreenTrail-releases/releases/latest)에서 받을 수 있습니다.

ScreenTrail(윈도우 무료 화면 캡처 프로그램) 소개 사이트. 빌드 과정 없는 정적 HTML과 Vercel 함수 하나(댓글)로 이루어져 있다.

```
index.html              페이지 본문 (소개 / 특징 / 다운로드 / 지원)
assets/css/site.css     페이지 디자인
assets/css/demos.css    앱 화면 데모 애니메이션 (블로그 원문 CSS)
assets/js/main.js       탭 이동, 기능 데모 전환, 댓글
assets/media/           소개 영상, 포스터 이미지
api/comments.js         댓글 API (Vercel Blob에 저장)
```

## 다운로드 링크 연결

`assets/js/main.js` 맨 위의 `DOWNLOAD_URL`에 설치 파일 주소를 넣으면 페이지의 모든 "무료 다운로드" 버튼에 연결된다. 비어 있으면 버튼을 눌렀을 때 "준비 중" 안내가 뜬다.

## 댓글

- Vercel 프로젝트에 Blob 스토어가 연결되어 있어야 한다 (`BLOB_READ_WRITE_TOKEN` 환경 변수가 자동으로 생긴다).
- 댓글 삭제: Vercel 환경 변수에 `COMMENTS_ADMIN_KEY`를 정해 두고 아래처럼 요청한다.

```bash
curl -X DELETE "https://<도메인>/api/comments?id=<댓글 id>" -H "x-admin-key: <COMMENTS_ADMIN_KEY>"
```

## 로컬에서 보기

```bash
python -m http.server 5173
```

댓글 API는 Vercel에서만 동작한다 (로컬에서 확인하려면 `vercel dev`).
