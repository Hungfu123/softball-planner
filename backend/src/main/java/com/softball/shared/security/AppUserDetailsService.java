package com.softball.shared.security;

import com.softball.domain.model.AppUser;
import com.softball.domain.port.out.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(AppUserDetailsService.class);

    private final AppUserRepository appUserRepository;

    public AppUserDetailsService(final AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(final String username) throws UsernameNotFoundException {
        final AppUser user = appUserRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Anmeldung fuer unbekannten Benutzer '{}'", username);
                    return new UsernameNotFoundException("Unbekannter Benutzer");
                });
        if (user.isLocked()) {
            log.warn("Anmeldung fuer gesperrten Account '{}' abgelehnt", user.getUsername());
        }
        return User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .accountLocked(user.isLocked())
                .build();
    }
}
