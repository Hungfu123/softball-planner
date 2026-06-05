package com.softball.domain.model;

public class InvitationContact {
    private String role;
    private String name;
    private String email;
    private String phone;

    public InvitationContact() {}

    public String getRole() { return role; }
    public void setRole(final String role) { this.role = role; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(final String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(final String phone) { this.phone = phone; }
}
