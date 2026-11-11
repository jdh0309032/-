# Motion Graphics Claude Code Setup

Claude Code가 이 저장소를 열면 아래 스킬/플러그인이 자동으로 로드됩니다.

| 출처 | 설치 방식 | 스킬 |
|---|---|---|
| [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) | `.claude/skills/` (vendored) | explainer-default, explainer-engaging, explainer-high-energy, motion-broll, object-separation, sound-effects |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | `.claude/skills/` (vendored) | hyperframes, hyperframes-cli, hyperframes-registry |
| [artemnovitckii/claude-animation-skills](https://github.com/artemnovitckii/claude-animation-skills) | `.claude/settings.json` 플러그인 | animation-skills (3D 만화, 지도 경로, 라인 인포그래픽 등) |
| 자체 룰셋 | `.claude/skills/custom-motion/` | custom-motion (60fps rAF, cubic-bezier(0.25,1,0.5,1), Canvas/WebGL 최적화) |

## 갱신 / 복원

```bash
npx skills update -p -y                          # 최신 버전으로 업데이트
npx skills experimental_install -a claude-code -y # skills-lock.json 기준 복원
```

`.devcontainer/devcontainer.json`은 Codespaces/devcontainer에서 ffmpeg, Python, Claude Code를 설치하고 lockfile 기준으로 스킬을 복원합니다.

## 참고

- `Miftahul-Islam-Efaz/Motion-graphics-skill`은 GitHub에서 찾을 수 없어(비공개 또는 삭제) 제외했습니다.
- hyperframes에는 더 이상 `motion-graphics` 스킬이 없어, 핵심 스킬(hyperframes / hyperframes-cli / hyperframes-registry)로 대체했습니다.
