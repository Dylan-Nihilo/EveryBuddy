export function runInitCommand(shell: string): void {
  if (shell !== "zsh") {
    throw new Error("Only `zsh` is supported for Phase 3.");
  }

  process.stdout.write(`${renderZshInitScript()}\n`);
}

export function renderZshInitScript(): string {
  const invocationWords = [process.execPath, process.argv[1] || "buddy"].map(shellEscape);

  return [
    "# EveryBuddy zsh hook",
    "if [[ -o interactive ]]; then",
    "  autoload -Uz add-zle-hook-widget 2>/dev/null || true",
    "  typeset -ga _everybuddy_cmd",
    `  _everybuddy_cmd=(${invocationWords.join(" ")})`,
    "  typeset -g _EVERYBUDDY_LAST_COMMAND=\"\"",
    "  typeset -g _EVERYBUDDY_LAST_BUFFER=\"\"",
    "  _everybuddy_should_run() {",
    "    [[ -n \"$TMUX\" && -z \"$EVERYBUDDY_SIDECAR\" ]]",
    "  }",
    "  _everybuddy_send_event() {",
    "    _everybuddy_should_run || return 0",
    "    \"${_everybuddy_cmd[@]}\" event \"$@\" >/dev/null 2>&1 &!",
    "  }",
    "  _everybuddy_attach() {",
    "    _everybuddy_should_run || return 0",
    "    \"${_everybuddy_cmd[@]}\" attach --quiet >/dev/null 2>&1 &!",
    "  }",
    "  _everybuddy_send_buffer() {",
    "    _everybuddy_should_run || return 0",
    "    local buffer=\"$BUFFER\"",
    "    if [[ \"$buffer\" == \"${_EVERYBUDDY_LAST_BUFFER:-}\" ]]; then",
    "      return 0",
    "    fi",
    "    typeset -g _EVERYBUDDY_LAST_BUFFER=\"$buffer\"",
    "    if [[ -n \"$buffer\" ]]; then",
    "      \"${_everybuddy_cmd[@]}\" event input_update --command \"$buffer\" --cwd \"$PWD\" >/dev/null 2>&1 &!",
    "    else",
    "      _everybuddy_send_event pane_active --cwd \"$PWD\"",
    "    fi",
    "  }",
    "  _everybuddy_line_pre_redraw() {",
    "    _everybuddy_send_buffer",
    "  }",
    "  _everybuddy_preexec() {",
    "    typeset -g _EVERYBUDDY_LAST_COMMAND=\"$1\"",
    "    typeset -g _EVERYBUDDY_LAST_BUFFER=\"\"",
    "    _everybuddy_send_event command_start --command \"$1\" --cwd \"$PWD\"",
    "  }",
    "  _everybuddy_precmd() {",
    "    local exit_code=$?",
    "    typeset -g _EVERYBUDDY_LAST_BUFFER=\"\"",
    "    _everybuddy_send_event pane_active --cwd \"$PWD\"",
    "    if [[ -n \"${_EVERYBUDDY_LAST_COMMAND:-}\" ]]; then",
    "      _everybuddy_send_event command_end --command \"$_EVERYBUDDY_LAST_COMMAND\" --cwd \"$PWD\" --exit-code \"$exit_code\"",
    "      typeset -g _EVERYBUDDY_LAST_COMMAND=\"\"",
    "    fi",
    "  }",
    "  typeset -ga preexec_functions precmd_functions",
    "  if (( ${preexec_functions[(Ie)_everybuddy_preexec]} == 0 )); then",
    "    preexec_functions+=(_everybuddy_preexec)",
    "  fi",
    "  if (( ${precmd_functions[(Ie)_everybuddy_precmd]} == 0 )); then",
    "    precmd_functions+=(_everybuddy_precmd)",
    "  fi",
    "  if whence add-zle-hook-widget >/dev/null 2>&1; then",
    "    add-zle-hook-widget -D line-pre-redraw _everybuddy_line_pre_redraw >/dev/null 2>&1 || true",
    "    add-zle-hook-widget line-pre-redraw _everybuddy_line_pre_redraw",
    "  fi",
    "  _everybuddy_attach",
    "fi",
  ].join("\n");
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
