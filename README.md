<img width=275 align="right" src="./imgs/screenshot.png">

# Obsidian TikZJax

A plugin for Obsidian that lets you render LaTeX and TikZ diagrams in your notes.

## Patch Metadata
- Author: Roberto Bissanti
- Date: 7 febbraio 2026
- Email: roberto.bissanti@gmail.com
- GitHub username: robertobissanti
- GitHub: https://github.com/robertobissanti
- Patch scope: export/print/PDF fixes for TikZ SVG rendering and placement

You can render graphs, figures, circuits, chemical diagrams, commutative diagrams, and more.

The following packages are available in `\usepackage{}`:
- chemfig
- tikz-cd
- circuitikz
- pgfplots
- array
- amsmath
  - amstext
- amsfonts
- amssymb
- tikz-3dplot

## Usage
Content inside of `tikz` code blocks will be rendered by TikZJax.

- Remember to load any packages you need with `\usepackage{}`, and include `\begin{document}` and `\end{document}`.

- The standalone document class is used (`\documentclass{standalone}`).


### Examples
<img width=300 align="right" src="./imgs/img1.png">

````latex
```tikz
\begin{document}
  \begin{tikzpicture}[domain=0:4]
    \draw[very thin,color=gray] (-0.1,-1.1) grid (3.9,3.9);
    \draw[->] (-0.2,0) -- (4.2,0) node[right] {$x$};
    \draw[->] (0,-1.2) -- (0,4.2) node[above] {$f(x)$};
    \draw[color=red]    plot (\x,\x)             node[right] {$f(x) =x$};
    \draw[color=blue]   plot (\x,{sin(\x r)})    node[right] {$f(x) = \sin x$};
    \draw[color=orange] plot (\x,{0.05*exp(\x)}) node[right] {$f(x) = \frac{1}{20} \mathrm e^x$};
  \end{tikzpicture}
\end{document}
```
````

<img width=325 align="right" src="./imgs/img2.png">

````latex
```tikz
\usepackage{circuitikz}
\begin{document}

\begin{circuitikz}[american, voltage shift=0.5]
\draw (0,0)
to[isource, l=$I_0$, v=$V_0$] (0,3)
to[short, -*, i=$I_0$] (2,3)
to[R=$R_1$, i>_=$i_1$] (2,0) -- (0,0);
\draw (2,3) -- (4,3)
to[R=$R_2$, i>_=$i_2$]
(4,0) to[short, -*] (2,0);
\end{circuitikz}

\end{document}
```
````

<img width=375 align="right" src="./imgs/img3.png">

````latex
```tikz
\usepackage{pgfplots}
\pgfplotsset{compat=1.16}

\begin{document}

\begin{tikzpicture}
\begin{axis}[colormap/viridis]
\addplot3[
	surf,
	samples=18,
	domain=-3:3
]
{exp(-x^2-y^2)*x};
\end{axis}
\end{tikzpicture}

\end{document}
```
````

<img width=400 align="right" src="./imgs/img4.png">

````latex
```tikz
\usepackage{tikz-cd}

\begin{document}
\begin{tikzcd}

    T
    \arrow[drr, bend left, "x"]
    \arrow[ddr, bend right, "y"]
    \arrow[dr, dotted, "{(x,y)}" description] & & \\
    K & X \times_Z Y \arrow[r, "p"] \arrow[d, "q"]
    & X \arrow[d, "f"] \\
    & Y \arrow[r, "g"]
    & Z

\end{tikzcd}

\quad \quad

\begin{tikzcd}[row sep=2.5em]

A' \arrow[rr,"f'"] \arrow[dr,swap,"a"] \arrow[dd,swap,"g'"] &&
  B' \arrow[dd,swap,"h'" near start] \arrow[dr,"b"] \\
& A \arrow[rr,crossing over,"f" near start] &&
  B \arrow[dd,"h"] \\
C' \arrow[rr,"k'" near end] \arrow[dr,swap,"c"] && D' \arrow[dr,swap,"d"] \\
& C \arrow[rr,"k"] \arrow[uu,<-,crossing over,"g" near end]&& D

\end{tikzcd}

\end{document}
```
````

<img width=325 align="right" src="./imgs/img5.png">

````latex
```tikz
\usepackage{chemfig}
\begin{document}

\chemfig{[:-90]HN(-[::-45](-[::-45]R)=[::+45]O)>[::+45]*4(-(=O)-N*5(-(<:(=[::-60]O)-[::+60]OH)-(<[::+0])(<:[::-108])-S>)--)}

\end{document}
```
````

<img width=310 align="right" src="./imgs/img6.png">

````latex
```tikz
\usepackage{chemfig}
\begin{document}

\definesubmol\fragment1{

    (-[:#1,0.85,,,draw=none]
    -[::126]-[::-54](=_#(2pt,2pt)[::180])
    -[::-70](-[::-56.2,1.07]=^#(2pt,2pt)[::180,1.07])
    -[::110,0.6](-[::-148,0.60](=^[::180,0.35])-[::-18,1.1])
    -[::50,1.1](-[::18,0.60]=_[::180,0.35])
    -[::50,0.6]
    -[::110])
    }

\chemfig{
!\fragment{18}
!\fragment{90}
!\fragment{162}
!\fragment{234}
!\fragment{306}
}

\end{document}
```
````

## Contributing
Contributions are welcome! For information on building Tikzjax, have a look at the [contributing guide](https://github.com/artisticat1/obsidian-tikzjax/issues/68), courtesy of [@thecodechemist99](https://github.com/thecodechemist99).

## Acknowledgements
This plugin would not be possible without [TikZJax](https://github.com/kisonecat/tikzjax) by [@kisonecat](https://github.com/kisonecat)! In particular, it uses
[@drgrice1's fork](https://github.com/drgrice1/tikzjax/tree/ww-modifications) that adds some additional features.

## Pandoc Integration (Obsidian Pandoc Plugin)
This fork includes a ready-to-use integration layer for the Obsidian Pandoc Plugin:
- https://github.com/OliverBalfour/obsidian-pandoc

Integration files are in:
- `obsidian-pandoc-integration/preamble.tex`
- `obsidian-pandoc-integration/tikz.lua`

### Recommended Obsidian Pandoc settings
In **Extra Pandoc Arguments**, use one option per line (no trailing `\\`):

```text
--resource-path=<PATH_TO_YOUR_VAULT>
--pdf-engine=xelatex
--include-in-header=obsidian-pandoc-integration/preamble.tex
--lua-filter=<PATH_TO_YOUR_VAULT>/.obsidian/plugins/<PLUGIN_ID>/obsidian-pandoc-integration/tikz.lua
```

Replace placeholders:
- `<PATH_TO_YOUR_VAULT>`: absolute path to your vault root
- `<PLUGIN_ID>`: plugin folder/id (for example: `obsidian-tikzjax-pdf`)

If needed, you can also pass an absolute TeX engine path (for example: `/Library/TeX/texbin/xelatex`).

In **Internal Link processing**, use:
- `Leave unchanged` (recommended)

### TikZ captions, labels, and placement in Markdown
Inside a `tikz` code block you can add metadata comments:

```latex
% caption: Sistema massa-molla orizzontale
% shortcaption: Massa-molla
% label: fig:massa-molla
% placement: H
\begin{document}
\begin{tikzpicture}
...
\end{tikzpicture}
\end{document}
```

Supported metadata:
- `% caption:` creates a LaTeX `figure` and `\caption{...}`
- `% shortcaption:` creates `\caption[short]{long}`
- `% label:` adds `\label{...}`
- `% placement:` sets figure placement (default: `htbp`, e.g. `H` requires `float` package)

If no caption is present, `tikzpicture` output is still centered.
