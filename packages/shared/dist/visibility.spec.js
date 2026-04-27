"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const visibility_1 = require("./visibility");
(0, vitest_1.describe)('computeCompleteness', () => {
    (0, vitest_1.it)('returns complete=true when all required fields are present', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: 'Eletricista',
            bio: 'Profissional com 10 anos de experiência em instalações residenciais.',
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.complete).toBe(true);
        (0, vitest_1.expect)(result.missing).toHaveLength(0);
    });
    (0, vitest_1.it)('returns missing=["specialty"] when specialty is empty', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: '',
            bio: 'Profissional experiente',
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.complete).toBe(false);
        (0, vitest_1.expect)(result.missing).toContain('specialty');
    });
    (0, vitest_1.it)('returns missing=["specialty"] when specialty is null', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: null,
            bio: 'Profissional experiente',
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.missing).toContain('specialty');
    });
    (0, vitest_1.it)('returns missing=["bio"] when bio is shorter than MIN_BIO_LENGTH', () => {
        const shortBio = 'a'.repeat(visibility_1.MIN_BIO_LENGTH - 1);
        const result = (0, visibility_1.computeCompleteness)({
            specialty: 'Eletricista',
            bio: shortBio,
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.complete).toBe(false);
        (0, vitest_1.expect)(result.missing).toContain('bio');
    });
    (0, vitest_1.it)('returns missing=["bio"] when bio is null', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: 'Eletricista',
            bio: null,
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.missing).toContain('bio');
    });
    (0, vitest_1.it)('accepts bio exactly at MIN_BIO_LENGTH', () => {
        const bio = 'a'.repeat(visibility_1.MIN_BIO_LENGTH);
        const result = (0, visibility_1.computeCompleteness)({
            specialty: 'Eletricista',
            bio,
            full_name: 'João Silva',
        });
        (0, vitest_1.expect)(result.complete).toBe(true);
        (0, vitest_1.expect)(result.missing).not.toContain('bio');
    });
    (0, vitest_1.it)('returns missing=["full_name"] when full_name is empty', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: 'Eletricista',
            bio: 'Profissional experiente',
            full_name: '',
        });
        (0, vitest_1.expect)(result.missing).toContain('full_name');
    });
    (0, vitest_1.it)('returns multiple missing fields when several are invalid', () => {
        const result = (0, visibility_1.computeCompleteness)({
            specialty: null,
            bio: null,
            full_name: null,
        });
        (0, vitest_1.expect)(result.complete).toBe(false);
        (0, vitest_1.expect)(result.missing).toContain('specialty');
        (0, vitest_1.expect)(result.missing).toContain('bio');
        (0, vitest_1.expect)(result.missing).toContain('full_name');
    });
});
(0, vitest_1.describe)('deriveVisibilityStatus', () => {
    (0, vitest_1.it)('returns "active" when complete and not deactivating', () => {
        const status = (0, visibility_1.deriveVisibilityStatus)({ complete: true, missing: [] });
        (0, vitest_1.expect)(status).toBe('active');
    });
    (0, vitest_1.it)('returns "draft" when incomplete and not deactivating', () => {
        const status = (0, visibility_1.deriveVisibilityStatus)({ complete: false, missing: ['bio'] });
        (0, vitest_1.expect)(status).toBe('draft');
    });
    (0, vitest_1.it)('returns "inactive" when deactivating regardless of completeness', () => {
        (0, vitest_1.expect)((0, visibility_1.deriveVisibilityStatus)({ complete: true, missing: [] }, { deactivating: true })).toBe('inactive');
        (0, vitest_1.expect)((0, visibility_1.deriveVisibilityStatus)({ complete: false, missing: ['bio'] }, { deactivating: true })).toBe('inactive');
    });
});
(0, vitest_1.describe)('isProfessionalPubliclyVisible', () => {
    const completeActive = {
        visibility_status: 'active',
        specialty: 'Eletricista',
        bio: 'Profissional com 10 anos de experiência',
        full_name: 'João Silva',
        roleIsActive: true,
    };
    (0, vitest_1.it)('returns true when all conditions are met', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)(completeActive)).toBe(true);
    });
    (0, vitest_1.it)('returns false when roleIsActive is false', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, roleIsActive: false })).toBe(false);
    });
    (0, vitest_1.it)('returns false when visibility_status is draft', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, visibility_status: 'draft' })).toBe(false);
    });
    (0, vitest_1.it)('returns false when visibility_status is inactive', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, visibility_status: 'inactive' })).toBe(false);
    });
    (0, vitest_1.it)('returns false when bio is too short', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, bio: 'curta' })).toBe(false);
    });
    (0, vitest_1.it)('returns false when specialty is empty', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, specialty: '' })).toBe(false);
    });
    (0, vitest_1.it)('returns false when full_name is empty', () => {
        (0, vitest_1.expect)((0, visibility_1.isProfessionalPubliclyVisible)({ ...completeActive, full_name: '' })).toBe(false);
    });
});
