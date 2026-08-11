class Avo::Actions::PublishNow < Avo::BaseAction
  self.name = "Publish now"
  self.message = "Publish the selected content immediately?"
  self.confirm_button_label = "Publish"

  def handle(query:, fields:, current_user:, resource:, **args)
    count = 0
    query.each do |record|
      # ContentItem rows respond to publish! directly; the nine concrete-type
      # resources (News, QuickLink, ...) publish through their content_item.
      target = record.respond_to?(:publish!) ? record : record.content_item
      target.publish!
      count += 1
    end
    succeed "Published #{count} #{'item'.pluralize(count)}."
  end
end
