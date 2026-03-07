cask "minichat" do
  version "1.0.2"
  sha256 "84243806eb4a94cedb2c6de3dea3923ce7db35158122a50987e569ed09708c65"

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
