class MediaAssetPolicy < ApplicationPolicy
  # The media library is shared: any content editor may browse and add assets.
  class Scope < ApplicationPolicy::Scope
    def resolve
      staff? ? scope.all : scope.none
    end

    private

    def staff?
      user&.admin? || user&.division_admin?
    end
  end

  def index?   = staff?
  def show?    = staff?
  def create?  = staff?
  def new?     = create?
  def update?  = staff?
  def edit?    = update?
  def destroy? = staff?

  private

  def staff?
    user&.admin? || user&.division_admin?
  end
end
