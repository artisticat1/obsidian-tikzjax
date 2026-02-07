local pkgs = {}

local function trim(s)
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function starts_with(s, prefix)
  return s:sub(1, #prefix) == prefix
end

function CodeBlock(el)
  if not el.classes:includes("tikz") then
    return nil
  end

  local out = {}
  local caption = nil
  local shortcaption = nil
  local label = nil
  local placement = "htbp"

  for line in el.text:gmatch("[^\r\n]+") do
    local l = trim(line)

    -- Metadata inside a tikz block:
    -- % caption: Figure caption text
    -- % shortcaption: Short caption for list of figures
    -- % label: fig:my-label
    -- % placement: htbp / H / ...
    if starts_with(l, "% caption:") then
      caption = trim(l:gsub("^%% caption:", "", 1))
    elseif starts_with(l, "% shortcaption:") then
      shortcaption = trim(l:gsub("^%% shortcaption:", "", 1))
    elseif starts_with(l, "% label:") then
      label = trim(l:gsub("^%% label:", "", 1))
    elseif starts_with(l, "% placement:") then
      local p = trim(l:gsub("^%% placement:", "", 1))
      if p ~= "" then
        placement = p
      end
    else
      local pkg = l:match("^\\usepackage%b{}")
      if pkg then
        pkgs[pkg] = true
      elseif not l:match("^\\documentclass%b{}")
        and l ~= "\\begin{document}"
        and l ~= "\\end{document}" then
        table.insert(out, line)
      end
    end
  end

  local tex = table.concat(out, "\n")
  local has_tikzpicture = tex:match("\\begin%s*{%s*tikzpicture%s*}")

  if has_tikzpicture and caption and caption ~= "" then
    local fig = {}
    table.insert(fig, "\\begin{figure}[" .. placement .. "]")
    table.insert(fig, "\\centering")
    table.insert(fig, tex)

    if shortcaption and shortcaption ~= "" then
      table.insert(fig, "\\caption[" .. shortcaption .. "]{" .. caption .. "}")
    else
      table.insert(fig, "\\caption{" .. caption .. "}")
    end

    if label and label ~= "" then
      table.insert(fig, "\\label{" .. label .. "}")
    end

    table.insert(fig, "\\end{figure}")
    tex = table.concat(fig, "\n")
  elseif has_tikzpicture then
    tex = "\\begin{center}\n" .. tex .. "\n\\end{center}"
  end

  return pandoc.RawBlock("latex", tex)
end

function Pandoc(doc)
  local includes = doc.meta["header-includes"] or pandoc.List()
  includes:insert(pandoc.RawBlock("latex", "\\usepackage{tikz}"))

  for p, _ in pairs(pkgs) do
    includes:insert(pandoc.RawBlock("latex", p))
  end

  doc.meta["header-includes"] = includes
  return doc
end
