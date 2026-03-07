cask "minichat" do
  version "1.0.10"
  sha256 "c9d61e909bedc0d1d3167c62ace4d0afd45eabcc4c52bae4b0eb6b2a43740d6c"

  url "https://github.com/Icarus603/minichat/releases/download/v#{version}/minichat-#{version}-macos-arm64.zip"
  name "MiniChat"
  desc "Terminal chatbot powered by ChatGPT and OpenAI models"
  homepage "https://github.com/Icarus603/minichat"

  depends_on arch: :arm64

  binary "minichat"

  caveats <<~EOS
    MiniChat itself is installed by this cask.

    If you want to use Sign in with ChatGPT or Sign in with Device Code,
    install the official Codex CLI separately first:

      npm install -g @openai/codex

    OpenAI API key and OpenRouter API key login do not require codex.
  EOS
end
