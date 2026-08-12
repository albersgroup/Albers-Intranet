class SessionsController < ApplicationController
  # OmniAuth handles CSRF for the request phase; skip Rails' check on the callback.
  skip_forgery_protection only: :create

  # GET /login — sign-in landing (Entra button + dev-login list in non-prod).
  def new
    redirect_to root_path and return if user_signed_in?
    @dev_users = User.order(:role, :email) unless Rails.env.production?
  end

  # GET|POST /auth/:provider/callback — real Entra ID sign-in.
  def create
    auth = request.env["omniauth.auth"]
    user = User.from_omniauth(auth)
    reset_session
    session[:user_id] = user.id
    redirect_to after_sign_in_path, notice: "Signed in as #{user.display_name}."
  rescue ActiveRecord::RecordInvalid => e
    redirect_to login_path, alert: "Could not sign you in: #{e.message}"
  end

  def failure
    redirect_to login_path, alert: "Authentication failed: #{params[:message]}"
  end

  # POST /dev_login — bypass used only until Entra consent is in place.
  def dev_create
    raise ActionController::RoutingError, "Not Found" if Rails.env.production?

    user = User.find(params[:user_id])
    reset_session
    session[:user_id] = user.id
    redirect_to after_sign_in_path, notice: "Signed in as #{user.display_name} (dev login)."
  end

  # DELETE /logout
  def destroy
    reset_session
    redirect_to login_path, notice: "Signed out."
  end

  private

  def after_sign_in_path
    current_user&.admin? || current_user&.division_admin? ? avo.root_path : root_path
  end
end
