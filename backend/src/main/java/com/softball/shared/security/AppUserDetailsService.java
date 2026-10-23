package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.port.out.AppUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Laedt Anmeldedaten aus {@code app_user}. Ein gesperrter Account wird als
 * {@code accountNonLocked = false} gemeldet; die Ablehnung uebernimmt Spring selbst.
 * Die Suche ignoriert Gross-/Kleinschreibung (siehe Adapter).
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public AppUserDetailsService(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(final String username) throws UsernameNotFoundException {
        final AppUser user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Unbekannter Benutzer"));
        return User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .accountLocked(user.isLocked())
                .build();
    }
}
