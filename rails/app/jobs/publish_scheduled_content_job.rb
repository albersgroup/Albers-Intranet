# Flips `scheduled` content items to `published` once their publish_at has
# passed. Wired as a recurring job in config/recurring.yml (Solid Queue), and
# also safe to run on demand. The ContentItem.live scope already treats due
# scheduled items as visible, so this job is about making the stored status
# reflect reality (and firing any publish-time side effects) rather than
# gating visibility.
class PublishScheduledContentJob < ApplicationJob
  queue_as :default

  def perform
    ContentItem.scheduled_due.find_each(&:publish!)
  end
end
