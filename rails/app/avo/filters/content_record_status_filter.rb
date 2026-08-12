class Avo::Filters::ContentRecordStatusFilter < Avo::Filters::SelectFilter
  self.name = "Status"

  def apply(request, query, value)
    return query if value.blank?

    query.joins(:content_item).where(content_items: { status: value })
  end

  def options
    ContentItem::STATUSES.index_with(&:humanize)
  end
end
