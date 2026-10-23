package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.shared.exception.NichtAngemeldetException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CurrentUserTest {

    private final AppUserRepository repo = mock(AppUserRepository.class);
    private final CurrentUser currentUser = new CurrentUser(repo);

    @AfterEach
    void aufraeumen() {
        SecurityContextHolder.clearContext();
    }

    private static AppUser account(final Role role) {
        final AppUser user = new AppUser();
        user.setUsername("hung");
        user.setRole(role);
        return user;
    }

    @Test
    void anonymLiefertLeerUndGetWirftNichtAngemeldet() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("k", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        assertThat(currentUser.find()).isEmpty();
        assertThatThrownBy(currentUser::get).isInstanceOf(NichtAngemeldetException.class);
    }

    @Test
    void ohneAuthentifizierungLiefertLeer() {
        assertThat(currentUser.find()).isEmpty();
    }

    @Test
    void angemeldetLiefertDenAccount() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("hung", null, AuthorityUtils.createAuthorityList("ROLE_SUPERADMIN")));
        final AppUser user = account(Role.SUPERADMIN);
        when(repo.findByUsername("hung")).thenReturn(Optional.of(user));

        assertThat(currentUser.get()).isSameAs(user);
        assertThat(currentUser.istGenauRolle(Role.SUPERADMIN)).isTrue();
        assertThat(currentUser.istGenauRolle(Role.ADMIN)).isFalse();
        verify(repo, times(1)).findByUsername("hung");
    }

    @Test
    void angemeldetAberAccountGeloeschtWirftNichtAngemeldet() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("weg", null, AuthorityUtils.createAuthorityList("ROLE_PLAYER")));
        when(repo.findByUsername("weg")).thenReturn(Optional.empty());

        assertThatThrownBy(currentUser::get).isInstanceOf(NichtAngemeldetException.class);
        assertThat(currentUser.istGenauRolle(Role.PLAYER)).isFalse();
    }
}
