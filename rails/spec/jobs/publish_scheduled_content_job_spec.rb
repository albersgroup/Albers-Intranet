require "rails_helper"

RSpec.describe PublishScheduledContentJob do
  it "publishes scheduled items whose publish_at has passed" do
    due    = create(:content_item, status: "scheduled", publish_at: 1.minute.ago)
    future = create(:content_item, :scheduled)

    described_class.perform_now

    expect(due.reload.status).to eq("published")
    expect(future.reload.status).to eq("scheduled")
  end
end
