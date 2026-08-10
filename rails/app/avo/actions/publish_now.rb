class Avo::Actions::PublishNow < Avo::BaseAction
  self.name = "Publish now"
  self.message = "Publish the selected content immediately?"
  self.confirm_button_label = "Publish"

  def handle(query:, fields:, current_user:, resource:, **args)
    count = 0
    query.each do |record|
      record.publish!
      count += 1
    end
    succeed "Published #{count} #{'item'.pluralize(count)}."
  end
end
