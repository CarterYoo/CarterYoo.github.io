# Seunghyun Yoo 개인 웹사이트

[Dasol Choi의 개인 홈페이지 템플릿](https://github.com/Dasol-Choi/dasol-choi.github.io)을 바탕으로 만든 학술 개인 웹사이트입니다. 원본의 Jekyll/Liquid 구조, Skeleton 레이아웃, 프로필 헤더, 메뉴와 경력 타임라인을 유지하고 Seunghyun Yoo의 정보로 구성했습니다.

## 로컬 미리보기

이 폴더에서 Node.js 20 이상과 pnpm을 사용합니다.

```sh
pnpm install
pnpm build
python3 -m http.server 8917 --directory dist
```

[http://localhost:8917](http://localhost:8917)에서 확인합니다. `pnpm build`는 YAML과 Liquid를 HTML로 렌더링하고, 파일·앵커·CSS 자산의 내부 링크를 검사합니다. `dist/`는 빌드 결과이므로 수정은 원본 파일에서 진행합니다.

## 내용 수정

| 파일 | 주요 내용과 필드 |
| --- | --- |
| `_data/main_info.yaml` | `name`, `title`, `subtitle`, `email`, `secondary_email`, `profile_pic`, `profile_alt`, `cv`, `github`, `linkedin`, `google_scholar`, `twitter` |
| `_data/content.yaml` | `about`와 `interests`는 문자열 목록. `news`: `date`, `text`, `url`. `education`: `school`, `time`, `degree`, `description`. `service`: `title`, `time`, `role`, `description`, `url` |
| `_data/publications.yaml` | `papers` 목록: `title`, `authors`, `venue`, `paper_pdf`, `code`, `dataset`, `huggingface`, `selected`, `type` |
| `_data/projects.yaml` | `projects` 목록: `title`, `subtitle`, `context`, `technologies`, `url`, `thumbnail`, `image_alt`, `image_caption`, `image_width`, `image_height`, `selected` |
| `_data/experience.yaml` | `experiences` 목록: `place`, `time`, `title`, `subtitle`, `description`, `url`, `category` |
| `_config.yml` | 사이트 제목·설명·주소, `baseurl`, 언어와 `updated` 표시 날짜 |

논문은 `selected: "y"`인 항목이 표시되며, `type: "preprint"`이면 Preprints에 분류됩니다. 경력의 `category`는 `work` 또는 `school`입니다. 내용은 일반 문자열로 작성하고, 논문 `authors`에서 이름 강조가 필요할 때만 `<b>Seunghyun Yoo</b>`를 사용합니다. 빈 SNS·논문 링크는 표시하지 않습니다.

디자인은 `_layouts/default.html`, `index.html`, `libs/custom/my_css.css`에서 수정할 수 있습니다. 변경한 뒤 `pnpm build`로 다시 확인합니다.

## 프로필 사진과 CV

사용자가 제공한 사진을 `assets/profile-pics/seunghyun-yoo.jpeg`에 넣었습니다. 사진을 바꿀 때는 예를 들어 `assets/profile-pics/seunghyun.jpg`를 추가한 뒤 다음 필드를 변경합니다.

```yaml
profile_pic: "/assets/profile-pics/seunghyun.jpg"
profile_alt: "Seunghyun Yoo"
```

사용자가 제공한 `SeunghyunYoo_CV (2).pdf`를 내용 변경 없이 [assets/cv/Seunghyun_Yoo_CV.pdf](assets/cv/Seunghyun_Yoo_CV.pdf)에 복사했습니다. 본문과 LinkedIn·논문·프로젝트 링크는 이 CV 및 사용자가 직접 제공한 프로필 정보에 근거합니다. Google Scholar와 X도 확인된 주소가 없어 비어 있습니다.

## 배포

현재 Sites 배포는 비공개 초안용입니다. 정적 빌드는 검색 수집을 제한하는 `robots.txt`의 `Disallow: /`를 생성합니다. 추후 공개할 때 Sites 공개 설정과 `scripts/build.mjs`의 robots 정책을 함께 조정하고 다시 빌드합니다.

프로젝트 루트의 Jekyll 소스도 GitHub Pages에서 사용할 수 있습니다. `username.github.io` 형태의 사용자 사이트라면 `_config.yml`의 `url`을 해당 주소로 바꾸고 `baseurl: ""`을 유지합니다. Sites 주소를 GitHub Pages 주소로 변경할 때 Open Graph 주소도 이 설정을 따릅니다.

템플릿 출처와 라이브러리 고지는 [ATTRIBUTION.md](ATTRIBUTION.md)에 기록했습니다.

Projects는 Ethogram, Margin Arena, DLM-Control 세 개입니다. 수업 프로젝트와 LLMs as Deceptive Agents 프리프린트는 사용자 요청에 따라 제외했습니다. 프로젝트 WebP와 출처는 `assets/projects/`에 있으며 이미지를 클릭하면 원본 크기로 열립니다.
