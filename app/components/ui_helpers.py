"""
Shared UI helpers for the Streamlit application.

Centralizes the visual design system (colors, type, spacing) as a single
injected CSS block, plus small render helpers so every page looks
consistent without repeating markup. No pipeline logic lives here - this
module only renders; app/pages/*.py call into rag_pipeline for anything
that touches documents, embeddings or the vector store.
"""

from typing import List, Sequence

import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
# Enterprise "control room" palette: deep ink-navy surfaces with a single
# restrained amber accent (the traditional caution/attention color for a
# risk-management tool), plus three desaturated status colors used only
# for status badges - never as decoration.

COLORS = {
    "bg": "#12151C",
    "surface": "#1B212C",
    "surface_alt": "#222A37",
    "border": "#2E3745",
    "text": "#E7E9EE",
    "text_muted": "#8D96A6",
    "accent": "#D9A448",
    "accent_soft": "#3A3222",
    "status_done": "#6FBF8B",
    "status_progress": "#D9A448",
    "status_pending": "#8D96A6",
    "status_error": "#E2685B",
}

FILE_TYPE_LABELS = {
    "pdf": "PDF",
    "docx": "DOCX",
    "csv": "CSV",
    "txt": "TXT",
}

# A muted, desaturated categorical palette for charts - deliberately not
# the default Plotly rainbow, so charts read as part of this design system
# rather than a generic analytics widget dropped on top of it.
CHART_PALETTE = ["#D9A448", "#6E93C4", "#6FBF8B", "#B080C0", "#C4826E", "#8D96A6"]

# Small inline icon set (stroke-based, single color via currentColor) so
# icons inherit whatever text color they're placed in without extra CSS.
_ICONS = {
    "docs": '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/><path d="M9 10h6M9 13h6M9 16h4"/>',
    "chunks": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    "status": '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    "compass": '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2.5 5.5L7 17l2.5-5.5z"/>',
}


def icon_svg(name: str, size: int = 18, color: str = None) -> str:
    stroke = color or COLORS["text_muted"]
    body = _ICONS.get(name, "")
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
        f'stroke="{stroke}" stroke-width="1.6" stroke-linecap="round" '
        f'stroke-linejoin="round" style="vertical-align: middle;">{body}</svg>'
    )


def inject_global_css() -> None:
    st.html(
        f"""
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
        html, body, [class*="css"] {{
            font-family: 'Inter', sans-serif;
        }}
        .stApp {{
            background-color: {COLORS['bg']};
            color: {COLORS['text']};
        }}
        .block-container {{
            padding-top: 2.6rem;
            padding-bottom: 3rem;
            max-width: 1180px;
        }}
        h1, h2, h3 {{
            font-family: 'Space Grotesk', sans-serif !important;
            color: {COLORS['text']} !important;
            font-weight: 600 !important;
            letter-spacing: -0.01em;
        }}
        h4, h5 {{
            color: {COLORS['text']} !important;
            font-weight: 600 !important;
            letter-spacing: 0.01em;
            margin-top: 1.6rem !important;
            margin-bottom: 0.9rem !important;
        }}
        p, span, label, div {{
            letter-spacing: 0.005em;
        }}
        hr {{
            border-color: {COLORS['border']} !important;
        }}

        /* ---------------------------------------------------------------
           Sidebar
        --------------------------------------------------------------- */
        section[data-testid="stSidebar"] {{
            background-color: {COLORS['surface']};
            border-right: 1px solid {COLORS['border']};
        }}
        section[data-testid="stSidebar"] .block-container {{
            padding-top: 1.4rem;
        }}
        section[data-testid="stSidebar"] [data-testid="stSidebarNav"] a,
        section[data-testid="stSidebar"] nav a {{
            border-radius: 6px;
            font-weight: 500;
            color: {COLORS['text_muted']} !important;
            transition: background-color 0.15s ease, color 0.15s ease;
        }}
        section[data-testid="stSidebar"] [data-testid="stSidebarNav"] a:hover,
        section[data-testid="stSidebar"] nav a:hover {{
            background-color: {COLORS['surface_alt']};
            color: {COLORS['text']} !important;
        }}
        section[data-testid="stSidebar"] [data-testid="stSidebarNav"] a[aria-current="page"],
        section[data-testid="stSidebar"] nav a[aria-current="page"] {{
            background-color: {COLORS['accent_soft']};
            color: {COLORS['accent']} !important;
            font-weight: 600;
        }}
        .pi-sidebar-brand {{
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 4px 4px 16px 4px;
            margin-bottom: 8px;
            border-bottom: 1px solid {COLORS['border']};
        }}
        .pi-sidebar-brand .pi-mark {{
            width: 30px;
            height: 30px;
            border-radius: 7px;
            background: linear-gradient(155deg, {COLORS['accent']} 0%, #A9772F 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1B1200;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
        }}
        .pi-sidebar-brand .pi-wordmark {{
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 14.5px;
            color: {COLORS['text']};
            line-height: 1.15;
        }}
        .pi-sidebar-brand .pi-tag {{
            font-size: 11px;
            color: {COLORS['accent']};
            font-weight: 500;
            letter-spacing: 0.02em;
        }}
        .pi-header {{
            border-bottom: 1px solid {COLORS['border']};
            padding-bottom: 16px;
            margin-bottom: 28px;
        }}
        .pi-header .pi-eyebrow {{
            color: {COLORS['accent']};
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 4px;
            letter-spacing: 0.03em;
        }}
        .pi-header .pi-subtitle {{
            color: {COLORS['text_muted']};
            font-size: 15px;
            margin-top: 4px;
            max-width: 640px;
        }}
        .pi-card {{
            background-color: {COLORS['surface']};
            border: 1px solid {COLORS['border']};
            border-radius: 8px;
            padding: 18px 20px;
            margin-bottom: 14px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 8px 20px -12px rgba(0,0,0,0.45);
        }}
        .pi-card-accent {{
            border-left: 3px solid {COLORS['accent']};
        }}
        .pi-metric-card {{
            background-color: {COLORS['surface']};
            border: 1px solid {COLORS['border']};
            border-radius: 8px;
            padding: 16px 18px;
            margin-bottom: 14px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 8px 20px -12px rgba(0,0,0,0.45);
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }}
        .pi-metric-card .pi-metric-icon {{
            width: 34px;
            height: 34px;
            border-radius: 7px;
            background-color: {COLORS['accent_soft']};
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}
        .pi-metric-label {{
            color: {COLORS['text_muted']};
            font-size: 12.5px;
            margin-bottom: 3px;
        }}
        .pi-metric-value {{
            font-family: 'Space Grotesk', sans-serif;
            font-size: 26px;
            font-weight: 600;
            color: {COLORS['text']};
            line-height: 1.1;
        }}
        .pi-badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid transparent;
        }}
        .pi-badge-done {{
            color: {COLORS['status_done']};
            background-color: rgba(111, 191, 139, 0.12);
            border-color: rgba(111, 191, 139, 0.3);
        }}
        .pi-badge-progress {{
            color: {COLORS['status_progress']};
            background-color: rgba(217, 164, 72, 0.12);
            border-color: rgba(217, 164, 72, 0.3);
        }}
        .pi-badge-pending {{
            color: {COLORS['status_pending']};
            background-color: rgba(141, 150, 166, 0.12);
            border-color: rgba(141, 150, 166, 0.3);
        }}
        .pi-badge-error {{
            color: {COLORS['status_error']};
            background-color: rgba(226, 104, 91, 0.12);
            border-color: rgba(226, 104, 91, 0.3);
        }}
        .pi-badge-filetype {{
            color: {COLORS['text_muted']};
            background-color: {COLORS['surface_alt']};
            border-color: {COLORS['border']};
            font-family: 'JetBrains Mono', monospace;
        }}
        .pi-chunk-text {{
            font-size: 14px;
            line-height: 1.55;
            color: {COLORS['text']};
        }}
        .pi-source-line {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 12.5px;
            color: {COLORS['text_muted']};
        }}
        .pi-score {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
        }}
        .pi-empty-state {{
            border: 1px dashed {COLORS['border']};
            border-radius: 8px;
            padding: 28px 20px;
            color: {COLORS['text_muted']};
            text-align: left;
        }}
        .pi-section-label {{
            font-family: 'Space Grotesk', sans-serif;
            font-size: 13px;
            font-weight: 600;
            color: {COLORS['text_muted']};
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 6px 0 10px 0;
        }}
        /* ---------------------------------------------------------------
           Buttons
        --------------------------------------------------------------- */
        div.stButton > button {{
            border-radius: 6px;
            font-weight: 600;
            padding: 0.5rem 1.1rem;
            transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
        }}
        div.stButton > button[kind="primary"] {{
            background-color: {COLORS['accent']};
            color: #1B1200;
            border: none;
        }}
        div.stButton > button[kind="primary"]:hover {{
            background-color: #E3B564;
            color: #1B1200;
        }}
        div.stButton > button[kind="secondary"] {{
            background-color: {COLORS['surface']};
            color: {COLORS['text']};
            border: 1px solid {COLORS['border']};
        }}
        div.stButton > button[kind="secondary"]:hover {{
            background-color: {COLORS['surface_alt']};
            border-color: {COLORS['accent']};
            color: {COLORS['accent']};
        }}
        div.stButton > button:active {{
            transform: translateY(1px);
        }}
        div.stButton > button:disabled {{
            opacity: 0.45;
        }}

        /* ---------------------------------------------------------------
           Inputs: text, file uploader, checkbox, select, slider, expander
        --------------------------------------------------------------- */
        .stTextInput input, .stSelectbox div[data-baseweb="select"] > div {{
            background-color: {COLORS['surface']} !important;
            border: 1px solid {COLORS['border']} !important;
            border-radius: 6px !important;
            color: {COLORS['text']} !important;
        }}
        .stTextInput input:focus {{
            border-color: {COLORS['accent']} !important;
            box-shadow: 0 0 0 1px {COLORS['accent']} !important;
        }}
        [data-testid="stFileUploaderDropzone"] {{
            background-color: {COLORS['surface']};
            border: 1px dashed {COLORS['border']};
            border-radius: 8px;
        }}
        [data-testid="stFileUploaderDropzone"]:hover {{
            border-color: {COLORS['accent']};
        }}
        .stCheckbox label p {{
            color: {COLORS['text']} !important;
        }}
        div[data-testid="stExpander"] {{
            background-color: {COLORS['surface']};
            border: 1px solid {COLORS['border']};
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 8px 20px -12px rgba(0,0,0,0.45);
        }}
        div[data-testid="stExpander"] summary {{
            font-weight: 500;
        }}
        .stSlider [data-baseweb="slider"] div[role="slider"] {{
            background-color: {COLORS['accent']} !important;
        }}
        .stSlider [data-baseweb="slider"] > div > div {{
            background-color: {COLORS['accent']} !important;
        }}

        /* ---------------------------------------------------------------
           Streamlit alert boxes (success / warning / error / info)
        --------------------------------------------------------------- */
        div[data-testid="stAlert"] {{
            border-radius: 8px;
            border: 1px solid {COLORS['border']};
        }}

        /* ---------------------------------------------------------------
           Metrics from st.metric, dataframes, and misc scrollbars
        --------------------------------------------------------------- */
        ::-webkit-scrollbar {{
            width: 10px;
            height: 10px;
        }}
        ::-webkit-scrollbar-track {{
            background: {COLORS['bg']};
        }}
        ::-webkit-scrollbar-thumb {{
            background: {COLORS['border']};
            border-radius: 5px;
        }}
        ::-webkit-scrollbar-thumb:hover {{
            background: {COLORS['text_muted']};
        }}
        </style>
        """
    )


def sidebar_brand() -> None:
    """Render a small brand mark + wordmark above the page navigation."""
    with st.sidebar:
        st.html(
            f"""
            <div class="pi-sidebar-brand">
                <div class="pi-mark">PI</div>
                <div>
                    <div class="pi-wordmark">Project Intelligence</div>
                    <div class="pi-tag">MILESTONE 1</div>
                </div>
            </div>
            """
        )


def page_header(eyebrow: str, title: str, subtitle: str) -> None:
    st.html(
        f"""
        <div class="pi-header">
            <div class="pi-eyebrow">{eyebrow}</div>
            <h1 style="margin:0;">{title}</h1>
            <div class="pi-subtitle">{subtitle}</div>
        </div>
        """
    )


def metric_card(label: str, value: str, icon: str = None) -> None:
    icon_html = (
        f'<div class="pi-metric-icon">{icon_svg(icon, size=17, color=COLORS["accent"])}</div>'
        if icon
        else ""
    )
    st.html(
        f"""
        <div class="pi-metric-card">
            {icon_html}
            <div>
                <div class="pi-metric-label">{label}</div>
                <div class="pi-metric-value">{value}</div>
            </div>
        </div>
        """
    )


def status_badge(status: str) -> str:
    """Return an HTML badge for a processing status ('success' / 'error' / 'pending' / 'in_progress')."""
    mapping = {
        "success": ("pi-badge-done", "Indexed"),
        "error": ("pi-badge-error", "Failed"),
        "pending": ("pi-badge-pending", "Pending"),
        "in_progress": ("pi-badge-progress", "Processing"),
    }
    css_class, label = mapping.get(status, ("pi-badge-pending", status))
    return f'<span class="pi-badge {css_class}">{label}</span>'


def filetype_badge(file_type: str) -> str:
    label = FILE_TYPE_LABELS.get(file_type, file_type.upper())
    return f'<span class="pi-badge pi-badge-filetype">{label}</span>'


def empty_state(message: str) -> None:
    st.html(f'<div class="pi-empty-state">{message}</div>')


def section_label(text: str) -> None:
    st.html(f'<div class="pi-section-label">{text}</div>')


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------
# All charts use a transparent background and the same muted palette so
# they read as part of the design system, not a generic analytics widget.
# Every chart here visualizes numbers the pipeline already computed
# (chunk counts, file types, retrieval distances) - nothing fabricated,
# and nothing that implies a Milestone 2/3 feature (risk scoring,
# forecasting) that hasn't actually been built.

_CHART_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, sans-serif", color=COLORS["text_muted"], size=12.5),
    margin=dict(l=0, r=10, t=6, b=6),
    showlegend=False,
)


def horizontal_bar_chart(labels: Sequence[str], values: Sequence[float], value_suffix: str = "") -> go.Figure:
    """A horizontal bar chart ranked by value, for source/chunk-count style breakdowns."""
    pairs = sorted(zip(labels, values), key=lambda p: p[1])
    sorted_labels = [p[0] for p in pairs]
    sorted_values = [p[1] for p in pairs]

    fig = go.Figure(
        go.Bar(
            x=sorted_values,
            y=sorted_labels,
            orientation="h",
            marker=dict(color=COLORS["accent"], line=dict(width=0)),
            text=[f"{v:g}{value_suffix}" for v in sorted_values],
            textposition="outside",
            textfont=dict(color=COLORS["text"], size=12.5),
            hovertemplate="%{y}: %{x}" + value_suffix + "<extra></extra>",
        )
    )
    fig.update_layout(**_CHART_LAYOUT)
    fig.update_xaxes(showgrid=False, visible=False, range=[0, max(sorted_values) * 1.25 if sorted_values else 1])
    fig.update_yaxes(showgrid=False, color=COLORS["text_muted"])
    height = max(120, 42 * len(labels))
    fig.update_layout(height=height)
    return fig


def donut_chart(labels: Sequence[str], values: Sequence[float]) -> go.Figure:
    """A donut chart for compositional breakdowns (e.g. chunk count by file type)."""
    fig = go.Figure(
        go.Pie(
            labels=list(labels),
            values=list(values),
            hole=0.62,
            marker=dict(colors=CHART_PALETTE, line=dict(color=COLORS["bg"], width=2)),
            textfont=dict(color=COLORS["text"], size=12.5),
            textinfo="label+value",
            hovertemplate="%{label}: %{value} (%{percent})<extra></extra>",
        )
    )
    fig.update_layout(**_CHART_LAYOUT, height=240)
    return fig

