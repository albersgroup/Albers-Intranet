class Avo::Filters::ContentStatusFilter < Avo::Filters::SelectFilter
  self.name = "Status"

  def apply(request, query, value)
    return query if value.blank?

    query.where(status: value)
  end

  def options
    ContentItem::STATUSES.index_with(&:humanize)
  end
end
