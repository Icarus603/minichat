cask "minichat" do
  version "1.0.9"
  sha256 "4a2eb0b1e5dd0a0947efe4b3c772ec9d26f566dd147699bd9e86b3c73d68e883"

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
