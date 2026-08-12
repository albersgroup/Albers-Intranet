# Shared Pundit policy for all nine concrete content-type models (News,
# QuickLink, HeroAsset, ...). Same rules as ContentItemPolicy — admins manage
# everything, division admins manage only their own division's content (plus
# org-wide items), viewers get read-only — just resolved through the
# content_item association since division/status live there, not on the
# concrete record. Wired into each type's Avo resource via
# `self.authorization_policy_class = ContentRecordPolicy`.
class ContentRecordPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if user&.admin?
      return scope.joins(:content_item).where(content_items: { division: [ user.division, nil ] }) if user&.division_admin?

      scope.joins(:content_item).merge(ContentItem.live)
    end
  end

  def index?  = staff?
  def show?   = staff?
  def create? = staff?
  def new?    = create?

  def update?
    return false unless staff?

    user.can_edit_division?(record.content_item&.division)
  end

  def edit?    = update?
  def destroy? = update?

  private

  def staff?
    user&.admin? || user&.division_admin?
  end
end
