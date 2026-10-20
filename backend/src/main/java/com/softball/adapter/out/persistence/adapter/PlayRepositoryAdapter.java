package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.PlayEntity;
import com.softball.adapter.out.persistence.mapper.PlayMapper;
import com.softball.adapter.out.persistence.repository.SpringPlayRepository;
import com.softball.domain.model.Play;
import com.softball.domain.port.out.PlayRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class PlayRepositoryAdapter implements PlayRepository {

    private final SpringPlayRepository repo;
    private final PlayMapper mapper;

    public PlayRepositoryAdapter(final SpringPlayRepository repo, final PlayMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Play> findAll() {
        return repo.findAllByOrderByUpdatedAtDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Play> findByCategoryId(final Long categoryId) {
        return repo.findByCategoryIdOrderByUpdatedAtDesc(categoryId).stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Play> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    @Transactional
    public Play save(final Play play) {
        final PlayEntity entity = play.getId() == null
                ? new PlayEntity()
                : repo.findById(play.getId()).orElseGet(PlayEntity::new);
        mapper.updateScalars(entity, play);

        // Zwei Spuelungen: erst die alten Staende weg, dann die neuen rein. In einer
        // einzigen wuerde Hibernate den neuen ordinal 1 einfuegen, bevor der alte
        // geloescht ist, und play_step_order_unique schlaegt zu.
        mapper.clearSteps(entity);
        repo.saveAndFlush(entity);

        mapper.replaceSteps(entity, play);
        return mapper.toDomain(repo.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        // Zuerst die Verweise anderer Plays loesen. Die Datenbank wuerde das ueber
        // ON DELETE SET NULL auch tun, aber Hibernate haelt die betroffenen Plays sonst
        // mit altem Wert im Persistenzkontext.
        repo.clearCounterpartReferences(id);
        repo.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByCategoryId(final Long categoryId) {
        return repo.existsByCategoryId(categoryId);
    }

    @Override
    @Transactional
    public int moveToCategory(final Long fromCategoryId, final Long toCategoryId) {
        return repo.moveToCategory(fromCategoryId, toCategoryId);
    }
}
