cask "minichat" do
  version "1.0.0"
  sha256 "0436860a7c692574e59de953ff4405649472c9dc7ff040418829a23aec2e0071"

  url "https://github.com/Icarus603/minichat/releases/download/v#{version}/minichat-#{version}-macos-arm64.zip"
  name "MiniChat"
  desc "Terminal chatbot powered by ChatGPT and OpenAI models"
  homepage "https://github.com/Icarus603/minichat"

  depends_on formula: "codex"
  depends_on arch: :arm64

  binary "minichat"
end
