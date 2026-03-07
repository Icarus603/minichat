cask "minichat" do
  version "1.0.0"
  sha256 "484e5de631b382851d69d8972103d5c2d622a5bfb717671fb50b4aac2f65d643"

  url "https://github.com/Icarus603/minichat/releases/download/v#{version}/minichat-#{version}-macos-arm64.zip"
  name "MiniChat"
  desc "Terminal chatbot powered by ChatGPT and OpenAI models"
  homepage "https://github.com/Icarus603/minichat"

  depends_on formula: "codex"
  depends_on arch: :arm64

  binary "minichat"
end
