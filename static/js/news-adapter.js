/**
 * News Integration Layer - Frontend Adapter
 * 
 * Provides an isolated client-side presentation and data-fetching layer for business news.
 * Normalizes article fields, formats timestamps, handles fallbacks, and manages UI states (loading, empty, error).
 */

(function (global) {
    'use strict';

    const NewsAdapter = {
        /**
         * Format ISO publication date into clean editorial format
         * e.g., "2026-10-18T08:30:00Z" -> "Oct 18, 2026 • 08:30 UTC"
         */
        formatDate(isoString) {
            if (!isoString) return '';
            try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) {
                    return isoString.substring(0, 10);
                }
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                return date.toLocaleDateString('en-US', options);
            } catch (e) {
                return isoString.substring(0, 10);
            }
        },

        /**
         * Clean string excerpt/summary
         */
        truncate(text, maxLen = 220) {
            if (!text) return '';
            if (text.length <= maxLen) return text;
            return text.substring(0, maxLen).trim() + '...';
        },

        /**
         * Normalize article object from NewsAPI or internal API
         */
        normalizeArticle(raw) {
            if (!raw) return null;
            return {
                title: raw.title || 'Untitled Article',
                url: raw.url || '#',
                source: (raw.source && raw.source.name) ? raw.source.name : (raw.source || 'Intelligence Wire'),
                author: raw.author || null,
                publishedAt: this.formatDate(raw.publishedAt || raw.published_at),
                description: raw.description || raw.summary || '',
                urlToImage: raw.urlToImage || raw.image_url || null
            };
        },

        /**
         * Render an article card HTML safely
         */
        renderArticleCard(rawArticle) {
            const article = this.normalizeArticle(rawArticle);
            if (!article) return '';

            const authorHtml = article.author 
                ? `<span>By <strong style="color: var(--text-secondary);">${this.escapeHtml(article.author)}</strong></span>` 
                : '';
            const dateHtml = article.publishedAt 
                ? `<span class="badge-mono" style="color: var(--text-muted);">${article.publishedAt}</span>` 
                : '';

            return `
                <article class="news-card-editorial">
                    <div class="news-meta-row">
                        <span class="news-source-tag">${this.escapeHtml(article.source)}</span>
                        ${authorHtml ? `<span>&bull;</span> ${authorHtml}` : ''}
                        ${dateHtml ? `<span>&bull;</span> ${dateHtml}` : ''}
                    </div>
                    <a href="${this.escapeHtml(article.url)}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="news-title-link">
                        ${this.escapeHtml(article.title)}
                        <span style="font-size: 0.8em; margin-left: 0.25rem;">&nearr;</span>
                    </a>
                    ${article.description ? `<p class="news-description-text">${this.escapeHtml(this.truncate(article.description))}</p>` : ''}
                    <div class="d-flex align-items-center justify-content-between pt-1">
                        <a href="${this.escapeHtml(article.url)}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="btn btn-outline-light btn-sm">
                            Read Original Source &rarr;
                        </a>
                    </div>
                </article>
            `;
        },

        /**
         * Escape HTML string helper
         */
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    global.NewsAdapter = NewsAdapter;
})(typeof window !== 'undefined' ? window : this);
