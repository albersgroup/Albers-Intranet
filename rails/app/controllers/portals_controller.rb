class PortalsController < ApplicationController
  # Public, server-rendered division portal. Every block on the page is driven
  # by ContentItem rows — the same unified model the admin edits — proving one
  # templated page can replace the six hand-assembled React home pages.
  def show
    @division = params[:division].presence_in(ContentItem::DIVISIONS) || "corporate"

    items = ContentItem.for_division(@division).live.includes(:media_asset, rich_text_body: :embeds_attachments).ordered
    @hero = items.find { |i| i.content_type == "hero_asset" }
    @sections = items.reject { |i| i == @hero }.group_by(&:section)

    @results = ContentItem.for_division(@division).live.search(params[:q]).ordered if params[:q].present?
  end
end
